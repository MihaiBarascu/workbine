<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\UserBlock;
use App\Support\MessageContexts;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $conversations = Conversation::query()
            ->forUser($user)
            ->with(['userOne.avatarImage', 'userTwo.avatarImage', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($query) => $query
                ->where('user_id', '<>', $user->id)
                ->whereNull('read_at')
                ->whereNull('hidden_at')])
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->through(function (Conversation $conversation) use ($user): array {
                $other = $conversation->other($user);
                $latest = $conversation->latestMessage;

                return [
                    'id' => $conversation->id,
                    'member' => $this->member($other),
                    'latest_message' => $latest === null ? null : [
                        'body' => $latest->hidden_at === null ? Str::limit($latest->body, 160) : 'Message removed by moderation.',
                        'mine' => $latest->user_id === $user->id,
                        'created_at' => $latest->created_at?->toIso8601String(),
                    ],
                    'unread_count' => (int) $conversation->getAttribute('unread_count'),
                ];
            });

        return Inertia::render('messages/index', ['conversations' => $conversations]);
    }

    public function create(Request $request, string $username): Response
    {
        $recipient = $this->recipient($request, $username);
        $context = MessageContexts::resolveForRecipient(
            $request->string('context_type')->toString() ?: null,
            $request->integer('context_id') ?: null,
            $recipient,
        );
        [$one, $two] = Conversation::pair($request->user(), $recipient);
        $conversation = Conversation::query()->where('user_one_id', $one)->where('user_two_id', $two)->first();

        return Inertia::render('messages/create', [
            'recipient' => $this->member($recipient),
            'context' => MessageContexts::serialize($context),
            'conversationId' => $conversation?->id,
            ...$this->blockState($request->user(), $recipient),
        ]);
    }

    public function start(Request $request, string $username): RedirectResponse
    {
        $sender = $request->user();
        $recipient = $this->recipient($request, $username);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'context_type' => ['nullable', 'required_with:context_id', Rule::in(['method', 'experience'])],
            'context_id' => ['nullable', 'integer', 'min:1', 'required_with:context_type'],
        ]);
        $this->ensureMessagingAllowed($sender, $recipient);
        $context = MessageContexts::resolveForRecipient(
            $data['context_type'] ?? null,
            isset($data['context_id']) ? (int) $data['context_id'] : null,
            $recipient,
        );
        [$one, $two] = Conversation::pair($sender, $recipient);
        $conversation = Conversation::query()->where('user_one_id', $one)->where('user_two_id', $two)->first();

        if ($conversation === null) {
            $key = 'new-conversation:'.$sender->id;
            if (RateLimiter::tooManyAttempts($key, 10)) {
                throw ValidationException::withMessages([
                    'body' => __('You have started several conversations today. Try again later.'),
                ]);
            }
            RateLimiter::hit($key, 86400);
        }

        $conversation = DB::transaction(function () use ($conversation, $one, $two, $sender, $data, $context): Conversation {
            $conversation ??= Conversation::query()->firstOrCreate([
                'user_one_id' => $one,
                'user_two_id' => $two,
            ]);
            $conversation->messages()->create([
                'user_id' => $sender->id,
                'body' => trim($data['body']),
                'context_type' => $context === null ? null : ($context instanceof \App\Models\Method ? 'method' : 'experience'),
                'context_id' => $context?->id,
            ]);
            $conversation->touch();

            return $conversation;
        });

        return to_route('messages.show', $conversation);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $user = $request->user();
        abort_unless($conversation->involves($user), 404);
        $conversation->load(['userOne.avatarImage', 'userTwo.avatarImage']);
        $other = $conversation->other($user);

        $conversation->messages()->where('user_id', '<>', $user->id)->whereNull('read_at')->update(['read_at' => now()]);
        $latestMessages = $conversation->messages()->latest('id')->limit(101)->get();
        $hasOlderMessages = $latestMessages->count() > 100;
        $messages = $latestMessages->take(100)->reverse()->values();
        $contexts = MessageContexts::forMessages($messages);

        return Inertia::render('messages/show', [
            'conversation' => [
                'id' => $conversation->id,
                'member' => $this->member($other),
                ...$this->blockState($user, $other),
            ],
            'hasOlderMessages' => $hasOlderMessages,
            'messages' => $messages->map(fn (Message $message): array => [
                'id' => $message->id,
                'body' => $message->hidden_at === null ? $message->body : null,
                'removed' => $message->hidden_at !== null,
                'mine' => $message->user_id === $user->id,
                'created_at' => $message->created_at?->toIso8601String(),
                'context' => $contexts[$message->id] ?? null,
            ])->all(),
        ]);
    }

    public function reply(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        abort_unless($conversation->involves($user), 404);
        $conversation->load(['userOne', 'userTwo']);
        $other = $conversation->other($user);
        $this->ensureMessagingAllowed($user, $other);
        $data = $request->validate(['body' => ['required', 'string', 'max:4000']]);

        DB::transaction(function () use ($conversation, $user, $data): void {
            $conversation->messages()->create([
                'user_id' => $user->id,
                'body' => trim($data['body']),
            ]);
            $conversation->touch();
        });

        return to_route('messages.show', $conversation);
    }

    private function recipient(Request $request, string $username): User
    {
        $recipient = User::query()->where('username', Str::lower($username))->firstOrFail();
        abort_if($recipient->id === $request->user()->id, 404);

        return $recipient;
    }

    private function ensureMessagingAllowed(User $sender, User $recipient): void
    {
        if (UserBlock::existsBetween($sender, $recipient)) {
            throw ValidationException::withMessages([
                'body' => __('Messaging is unavailable for this conversation.'),
            ]);
        }
    }

    /** @return array{id: int, name: string, username: string, avatar_url: string|null} */
    private function member(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'avatar_url' => $user->avatarUrl(),
        ];
    }

    /** @return array{messaging_blocked: bool, blocked_by_me: bool} */
    private function blockState(User $user, User $other): array
    {
        $blockedByMe = UserBlock::query()->where('blocker_id', $user->id)->where('blocked_id', $other->id)->exists();
        $blockedByOther = UserBlock::query()->where('blocker_id', $other->id)->where('blocked_id', $user->id)->exists();

        return [
            'messaging_blocked' => $blockedByMe || $blockedByOther,
            'blocked_by_me' => $blockedByMe,
        ];
    }
}
