<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMethodRequest;
use App\Http\Requests\UpdateMethodRequest;
use App\Models\CommunityNotification;
use App\Models\Method;
use App\Models\MethodUpdate;
use App\Models\Topic;
use App\Models\User;
use App\Services\ContentModeration;
use App\Support\ContributionRevision;
use App\Support\RichText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Inertia\Support\SessionKey;

class MethodController extends Controller
{
    public function redirectUpdate(Topic $topic, int $update): RedirectResponse
    {
        $methodUpdate = MethodUpdate::query()
            ->whereKey($update)
            ->whereHas('method', fn ($query) => $query->where('topic_id', $topic->id))
            ->firstOrFail();

        return redirect()->to(route('methods.show', [$topic, $methodUpdate->method_id]).'#method-update-'.$methodUpdate->id);
    }

    public function show(Topic $topic, Method $method): Response
    {
        $method->load(['user:id,name,username,avatar_image_id', 'user.avatarImage', 'updates'])
            ->loadCount([
                'experiences',
                'experiences as worked_count' => fn ($query) => $query->where('outcome', 'worked'),
                'experiences as partly_count' => fn ($query) => $query->where('outcome', 'partly'),
            ]);

        return Inertia::render('topics/method-show', [
            'topic' => $topic->only(['id', 'title', 'slug']),
            'method' => $this->serializeMethod($method),
            'canonicalUrl' => route('methods.show', [$topic, $method]),
        ]);
    }

    public function edit(Request $request, Topic $topic, Method $method): Response
    {
        abort_unless($request->user()?->getAuthIdentifier() === $method->user_id, 403);

        return Inertia::render('topics/method-edit', [
            'topic' => $topic->only(['id', 'title', 'slug']),
            'method' => $method->only(['id', 'title', 'body', 'body_document', 'source_url', 'protected_at']),
            'submissionId' => (string) Str::uuid(),
            'revision' => ContributionRevision::token($method),
        ]);
    }

    public function update(UpdateMethodRequest $request, Topic $topic, Method $method): RedirectResponse
    {
        $data = $request->validated();
        app(ContentModeration::class)->text($request->user(), Arr::only($data, ['title', 'body', 'source_url']), 'method:'.$method->id, 'body');

        DB::transaction(function () use ($method, $data): void {
            $current = Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();

            if ($current->protected_at !== null) {
                throw ValidationException::withMessages(['revision' => __('Someone has tried this method. The original is preserved; add a dated update instead.')]);
            }

            if (! hash_equals(ContributionRevision::token($current), $data['revision'])) {
                throw ValidationException::withMessages([
                    'revision' => __('This method changed after you opened the editor. Copy your changes, then reload the latest version before saving.'),
                ]);
            }

            $current->update([
                'title' => $data['title'],
                'body' => $data['body'],
                'source_url' => $data['source_url'] ?? null,
            ]);
            RichText::save($current, $data['body_document'] ?? null);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Method updated.')]);

        return to_route('methods.show', [$topic, $method]);
    }

    public function addUpdate(Request $request, Topic $topic, Method $method): RedirectResponse
    {
        abort_unless($request->user()?->getAuthIdentifier() === $method->user_id, 403);

        // A lost response can leave the previous success in this session.
        // Feedback on this submission must describe its own outcome, including
        // validation and moderation failures. Leave unrelated flash data intact.
        $request->session()->forget(SessionKey::FLASH_DATA.'.toast');

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'submission_id' => ['required', 'uuid'],
        ]);
        app(ContentModeration::class)->text($request->user(), ['body' => $data['body']], 'method:update:'.$method->id, 'body');
        $created = DB::transaction(function () use ($method, $data): bool {
            $current = Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();
            if ($current->protected_at === null) {
                throw ValidationException::withMessages(['body' => __('This method can still be edited. Edit the original before it receives an experience.')]);
            }
            $update = MethodUpdate::query()->firstOrCreate(
                ['method_id' => $current->id, 'submission_id' => $data['submission_id']],
                ['body' => $data['body']],
            );

            if ($update->body !== $data['body']) {
                throw ValidationException::withMessages([
                    'submission_id' => __('An earlier version of this update was already published. Your current text has not been published. You can use this draft for a new update.'),
                ]);
            }

            return $update->wasRecentlyCreated;
        });
        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $created ? __('Update added.') : __('This update was already published.'),
        ]);

        return to_route('methods.show', [$topic, $method]);
    }

    public function create(Topic $topic): Response
    {
        return Inertia::render('topics/method-create', [
            'topic' => [
                'id' => $topic->id,
                'title' => $topic->title,
                'slug' => $topic->slug,
            ],
        ]);
    }

    public function store(StoreMethodRequest $request, Topic $topic): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        app(ContentModeration::class)->text($user, Arr::only($data, ['title', 'body', 'source_url']), 'method:new:'.$topic->id, 'body');

        $method = DB::transaction(function () use ($topic, $user, $data): Method {
            $method = $topic->methods()->create([
                'user_id' => $user->id,
                'title' => $data['title'],
                'body' => $data['body'],
                'source_url' => $data['source_url'] ?? null,
            ]);

            RichText::save($method, $data['body_document'] ?? null);
            CommunityNotification::forMethod($method);

            return $method;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Method created.'),
        ]);

        return to_route('methods.show', [$topic, $method]);
    }

    /** @return array<string, mixed> */
    private function serializeMethod(Method $method): array
    {
        return [
            'id' => $method->id,
            'title' => $method->title,
            'body' => $method->body,
            'body_document' => $method->body_document,
            'protected_at' => $method->protected_at?->toIso8601String(),
            'updates' => $method->updates->map(fn ($update) => [
                'id' => $update->id, 'body' => $update->body, 'created_at' => $update->created_at?->toIso8601String(),
            ])->all(),
            'source_url' => $method->source_url,
            'created_at' => $method->created_at?->toIso8601String(),
            'updated_at' => $method->updated_at?->toIso8601String(),
            'experiences_count' => $method->experiences_count ?? 0,
            'worked_count' => $method->worked_count ?? 0,
            'partly_count' => $method->partly_count ?? 0,
            'user' => [
                'id' => $method->user->id,
                'name' => $method->user->name,
                'username' => $method->user->username,
                'avatar_url' => $method->user->avatarUrl(),
            ],
        ];
    }
}
