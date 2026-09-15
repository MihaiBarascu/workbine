<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTopicRequest;
use App\Http\Requests\UpdateTopicRequest;
use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\TopicTag;
use App\Models\User;
use App\Services\ContentModeration;
use App\Support\ContributionRevision;
use App\Support\RichText;
use App\Support\TopicDiscovery;
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
    public function index(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $view = in_array($request->query('view'), ['unanswered', 'trending', 'saved'], true) ? $request->query('view') : 'latest';
        $sort = in_array($request->query('sort'), ['oldest', 'active'], true) ? $request->query('sort') : 'newest';
        $categoryInput = $request->query('category');
        $category = is_string($categoryInput) && array_key_exists($categoryInput, TopicDiscovery::categories()) ? $categoryInput : '';
        $tag = is_string($request->query('tag')) ? Str::limit($request->query('tag'), 24, '') : '';
        $scope = $request->query('scope') === 'people' ? 'people' : 'topics';
        $input = $request->query('q', '');
        $search = is_string($input) ? Str::limit(Str::squish($input), 120, '') : '';
        $query = Topic::query()->withCover();
        if ($request->user() !== null) {
            $query->withExists(['saves as saved' => fn ($query) => $query->where('user_id', $request->user()->getAuthIdentifier()), 'likes as liked' => fn ($query) => $query->where('user_id', $request->user()->getAuthIdentifier())]);
            Inertia::encryptHistory();
        }

        $query->when($category !== '', fn ($query) => $query->where('category', $category))
            ->when($tag !== '', fn ($query) => $query->whereHas('tags', fn ($query) => $query->where('name', $tag)));

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

        // A transparent recent-activity signal, not a reputation score.
        if ($view === 'saved') {
            $query->orderByDesc('saves_count');
        }
        if ($view === 'trending' || $sort === 'active') {
            $query->orderByRaw('(SELECT COUNT(*) FROM methods WHERE methods.topic_id = topics.id AND methods.hidden_at IS NULL AND methods.created_at >= ?) + (SELECT COUNT(*) FROM saved_topics WHERE saved_topics.topic_id = topics.id AND saved_topics.user_id <> topics.user_id AND saved_topics.created_at >= ?) DESC', [now()->subDays(14), now()->subDays(14)]);
        }
        $topics = $query
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage', 'tags'])
            ->withCount(['methods', 'communitySaves as saves_count', 'likes'])
            ->orderBy('topics.created_at', $sort === 'oldest' ? 'asc' : 'desc')
            ->orderBy('topics.id', $sort === 'oldest' ? 'asc' : 'desc')
            ->paginate(12)
            ->appends(['view' => $view, 'q' => $search, ...array_filter(['category' => $category, 'tag' => $tag, 'sort' => $sort === 'newest' ? null : $sort, 'scope' => $scope === 'topics' ? null : $scope])])
            ->through(fn (Topic $topic): array => $this->serializeTopic($topic));

        $showHomepageExample = $search === ''
            && $view === 'latest'
            && $sort === 'newest'
            && $scope === 'topics'
            && $category === ''
            && $tag === ''
            && $topics->currentPage() === 1;

        $response = Inertia::render('topics/index', [
            'topics' => $topics,
            'view' => $view,
            'search' => $search,
            'category' => $category,
            'tag' => $tag,
            'sort' => $sort,
            'scope' => $scope,
            'categories' => array_intersect_key(
                TopicDiscovery::categories(),
                array_fill_keys([
                    ...Topic::query()->whereNotNull('category')->distinct()->pluck('category')->all(),
                    ...($category !== '' ? [$category] : []),
                ], true),
            ),
            'availableTags' => TopicTag::query()->whereHas('topic')->select('name')->distinct()->orderBy('name')->limit(40)->pluck('name'),
            'categoryCounts' => Topic::query()->whereNotNull('category')->select('category')->selectRaw('COUNT(*) as total')->groupBy('category')->pluck('total', 'category'),
            'homepageExample' => $showHomepageExample ? $this->homepageExample() : null,
            'people' => $scope !== 'people' ? null : User::query()->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", ['%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%'])
                ->orWhereRaw("LOWER(username) LIKE ? ESCAPE '!'", ['%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%'])))
                ->with('avatarImage')->withCount(['topics', 'methods'])->orderBy('name')->orderBy('id')->paginate(12)->appends(['scope' => 'people', 'q' => $search])
                ->through(fn (User $member): array => ['id' => $member->id, 'name' => $member->name, 'username' => $member->username, 'avatar_url' => $member->avatarUrl(), 'topics_count' => $member->topics_count, 'methods_count' => $member->methods_count]),
        ])->toResponse($request);
        if ($request->user() !== null) {
            $response->headers->set('Cache-Control', 'private, no-store');
        }

        return $response;
    }

    public function create(Request $request): Response
    {
        $title = $request->query('title', '');

        return Inertia::render('topics/create', [
            'categories' => TopicDiscovery::categories(),
            'initialTitle' => is_string($title) ? Str::limit(Str::squish($title), 160, '') : '',
        ]);
    }

    public function store(StoreTopicRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        app(ContentModeration::class)->text($user, [...Arr::only($data, ['title', 'description', 'method_title', 'method_body', 'method_source_url']), 'tags' => implode(', ', $data['tags'] ?? [])], 'topic:new', 'title');

        $topic = DB::transaction(function () use ($user, $data, $request): Topic {
            $topic = $user->topics()->create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'] ?? null,
                'slug' => $this->uniqueSlug($data['title']),
            ]);

            $topic->tags()->createMany(array_map(fn ($name) => ['name' => $name], $data['tags'] ?? []));

            if ($request->boolean('include_method')) {
                $method = $topic->methods()->create([
                    'user_id' => $user->id,
                    'title' => $data['method_title'],
                    'body' => $data['method_body'],
                    'source_url' => $data['method_source_url'] ?? null,
                ]);
                RichText::save($method, $data['method_body_document'] ?? null, 'method_body');
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
            'topic' => [...$topic->only(['id', 'title', 'slug', 'description', 'category']), 'tags' => $topic->tags->pluck('name')],
            'categories' => TopicDiscovery::categories(),
            'revision' => ContributionRevision::token($topic),
        ]);
    }

    public function update(UpdateTopicRequest $request, Topic $topic): RedirectResponse
    {
        $data = $request->validated();
        app(ContentModeration::class)->text($request->user(), [...Arr::only($data, ['title', 'description']), 'tags' => implode(', ', $data['tags'] ?? [])], 'topic:'.$topic->id, 'title');

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
                'category' => array_key_exists('category', $data) ? $data['category'] : $current->category,
            ]);
            if (array_key_exists('tags', $data)) {
                $current->tags()->delete();
                $current->tags()->createMany(array_map(fn ($name) => ['name' => $name], $data['tags']));
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Topic updated.')]);

        return to_route('topics.show', $topic);
    }

    public function show(Request $request, Topic $topic): Response
    {
        $topic->load(['user:id,name,username,avatar_image_id', 'user.avatarImage', 'tags'])
            ->loadCount(['methods', 'communitySaves as saves_count', 'likes']);
        $topic->setAttribute('liked', $request->user() !== null && $topic->likes()->where('user_id', $request->user()->getAuthIdentifier())->exists());

        $methods = $topic->methods()
            ->select(['methods.id', 'methods.topic_id', 'methods.user_id', 'methods.title', 'methods.body', 'methods.source_url', 'methods.protected_at', 'methods.created_at', 'methods.updated_at'])
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->withCount([
                'experiences',
                'experiences as worked_count' => fn ($query) => $query->where('outcome', 'worked'),
                'experiences as partly_count' => fn ($query) => $query->where('outcome', 'partly'),
            ])
            ->latest()
            ->orderByDesc('id')
            ->paginate(10)
            ->through(fn (Method $method): array => $this->serializeMethodSummary($method));

        return Inertia::render('topics/show', [
            'topic' => $this->serializeTopic($topic),
            'methods' => $methods,
            'saved' => $request->user() !== null && SavedTopic::query()
                ->where('user_id', $request->user()->getAuthIdentifier())
                ->where('topic_id', $topic->id)
                ->exists(),
        ]);
    }

    /** @return array{topic: array{title: string, slug: string}, method: array<string, mixed>}|null */
    private function homepageExample(): ?array
    {
        $method = Method::query()
            ->select(['methods.id', 'methods.topic_id', 'methods.user_id', 'methods.title', 'methods.body', 'methods.source_url', 'methods.protected_at', 'methods.created_at', 'methods.updated_at'])
            ->whereHas('experiences')
            ->with(['topic:id,title,slug', 'user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->withCount([
                'experiences',
                'experiences as worked_count' => fn ($query) => $query->where('outcome', 'worked'),
                'experiences as partly_count' => fn ($query) => $query->where('outcome', 'partly'),
            ])
            ->latest('methods.created_at')
            ->orderByDesc('methods.id')
            ->first();

        if ($method === null) {
            return null;
        }

        return [
            'topic' => [
                'title' => $method->topic->title,
                'slug' => $method->topic->slug,
            ],
            'method' => $this->serializeMethodSummary($method),
        ];
    }

    /** @return array<string, mixed> */
    private function serializeMethodSummary(Method $method): array
    {
        return [
            'id' => $method->id,
            'title' => $method->title,
            'body' => Str::limit(Str::squish($method->body), 239, '…'),
            'protected_at' => $method->protected_at?->toIso8601String(),
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

    /** @return array<string, mixed> */
    private function serializeTopic(Topic $topic): array
    {
        return [
            'id' => $topic->id,
            'title' => $topic->title,
            'slug' => $topic->slug,
            'description' => $topic->description,
            'category' => $topic->category,
            'tags' => $topic->relationLoaded('tags') ? $topic->tags->pluck('name')->all() : [],
            'likes_count' => $topic->likes_count ?? 0,
            'liked' => (bool) $topic->getAttribute('liked'),
            'saved' => (bool) $topic->getAttribute('saved'),
            'cover_image' => $topic->relationLoaded('coverImage') ? $topic->coverImage?->publicData() : null,
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
