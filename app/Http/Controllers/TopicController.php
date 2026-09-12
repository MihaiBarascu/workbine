<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTopicRequest;
use App\Http\Requests\UpdateTopicRequest;
use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use App\Services\ContentModeration;
use App\Support\ContributionRevision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    public function index(Request $request): Response
    {
        $view = $request->query('view') === 'unanswered' ? 'unanswered' : 'latest';
        $input = $request->query('q', '');
        $search = is_string($input) ? Str::limit(Str::squish($input), 120, '') : '';
        $query = Topic::query();

        if ($view === 'unanswered') {
            $query->doesntHave('methods');
        }

        if ($search !== '') {
            // Literal substring matching, including %, _ and !, on SQLite and PostgreSQL.
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%';
            $query->where(fn ($query) => $query
                ->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereRaw("LOWER(description) LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereHas('methods', fn ($methods) => $methods
                    ->where(fn ($methods) => $methods
                        ->whereRaw("LOWER(methods.title) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(methods.body) LIKE ? ESCAPE '!'", [$pattern]))));
        }

        $topics = $query
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->withCount(['methods', 'communitySaves as saves_count'])
            ->latest()
            ->orderByDesc('id')
            ->paginate(12)
            ->appends(['view' => $view, 'q' => $search])
            ->through(fn (Topic $topic): array => $this->serializeTopic($topic));

        return Inertia::render('topics/index', [
            'topics' => $topics,
            'view' => $view,
            'search' => $search,
        ]);
    }

    public function create(Request $request): Response
    {
        $title = $request->query('title', '');

        return Inertia::render('topics/create', [
            'initialTitle' => is_string($title) ? Str::limit(Str::squish($title), 160, '') : '',
        ]);
    }

    public function store(StoreTopicRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        app(ContentModeration::class)->text($user, Arr::only($data, ['title', 'description', 'method_title', 'method_body', 'method_source_url']), 'topic:new', 'title');

        $topic = DB::transaction(function () use ($user, $data, $request): Topic {
            $topic = $user->topics()->create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'slug' => $this->uniqueSlug($data['title']),
            ]);

            if ($request->boolean('include_method')) {
                $topic->methods()->create([
                    'user_id' => $user->id,
                    'title' => $data['method_title'],
                    'body' => $data['method_body'],
                    'source_url' => $data['method_source_url'] ?? null,
                ]);
            }

            return $topic;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $request->boolean('include_method')
                ? __('Topic and method published.')
                : __('Topic published.'),
        ]);

        return to_route('topics.show', $topic);
    }

    public function edit(Request $request, Topic $topic): Response
    {
        abort_unless($request->user()?->getAuthIdentifier() === $topic->user_id, 403);

        return Inertia::render('topics/edit', [
            'topic' => $topic->only(['id', 'title', 'slug', 'description']),
            'revision' => ContributionRevision::token($topic),
        ]);
    }

    public function update(UpdateTopicRequest $request, Topic $topic): RedirectResponse
    {
        $data = $request->validated();
        app(ContentModeration::class)->text($request->user(), Arr::only($data, ['title', 'description']), 'topic:'.$topic->id, 'title');

        DB::transaction(function () use ($topic, $data): void {
            $current = Topic::query()->whereKey($topic->id)->lockForUpdate()->firstOrFail();

            if (! hash_equals(ContributionRevision::token($current), $data['revision'])) {
                throw ValidationException::withMessages([
                    'revision' => __('This topic changed after you opened the editor. Copy your changes, then reload the latest version before saving.'),
                ]);
            }

            $current->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Topic updated.')]);

        return to_route('topics.show', $topic);
    }

    public function show(Request $request, Topic $topic): Response
    {
        $topic->load(['user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->loadCount(['methods', 'communitySaves as saves_count']);

        $methods = $topic->methods()
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->withCount('experiences')
            ->latest()
            ->orderByDesc('id')
            ->get()
            ->map(fn (Method $method): array => $this->serializeMethod($method));

        return Inertia::render('topics/show', [
            'topic' => $this->serializeTopic($topic),
            'methods' => $methods,
            'saved' => $request->user() !== null && SavedTopic::query()
                ->where('user_id', $request->user()->getAuthIdentifier())
                ->where('topic_id', $topic->id)
                ->exists(),
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeTopic(Topic $topic): array
    {
        return [
            'id' => $topic->id,
            'title' => $topic->title,
            'slug' => $topic->slug,
            'description' => $topic->description,
            'created_at' => $topic->created_at?->toIso8601String(),
            'updated_at' => $topic->updated_at?->toIso8601String(),
            'methods_count' => $topic->methods_count ?? 0,
            'saves_count' => $topic->saves_count ?? 0,
            'user' => [
                'id' => $topic->user->id,
                'name' => $topic->user->name,
                'username' => $topic->user->username,
                'avatar_url' => $topic->user->avatarUrl(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function serializeMethod(Method $method): array
    {
        return [
            'id' => $method->id,
            'title' => $method->title,
            'body' => $method->body,
            'source_url' => $method->source_url,
            'created_at' => $method->created_at?->toIso8601String(),
            'updated_at' => $method->updated_at?->toIso8601String(),
            'experiences_count' => $method->experiences_count ?? 0,
            'user' => [
                'id' => $method->user->id,
                'name' => $method->user->name,
                'username' => $method->user->username,
                'avatar_url' => $method->user->avatarUrl(),
            ],
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'topic';
        $slug = $base;
        $suffix = 2;

        while (Topic::withoutGlobalScopes()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
