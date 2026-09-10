<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTopicRequest;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TopicController extends Controller
{
    public function index(): Response
    {
        $topics = Topic::query()
            ->with('user:id,name')
            ->latest()
            ->paginate(12)
            ->through(fn (Topic $topic): array => $this->serializeTopic($topic));

        return Inertia::render('topics/index', [
            'topics' => $topics,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('topics/create');
    }

    public function store(StoreTopicRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();

        $topic = $user->topics()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'slug' => $this->uniqueSlug($data['title']),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Topic published.'),
        ]);

        return to_route('topics.show', $topic);
    }

    public function show(Topic $topic): Response
    {
        $topic->load('user:id,name');

        return Inertia::render('topics/show', [
            'topic' => $this->serializeTopic($topic),
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
            'user' => [
                'id' => $topic->user->id,
                'name' => $topic->user->name,
            ],
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'topic';
        $slug = $base;
        $suffix = 2;

        while (Topic::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
