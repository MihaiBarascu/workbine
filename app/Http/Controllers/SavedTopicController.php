<?php

namespace App\Http\Controllers;

use App\Models\SavedTopic;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class SavedTopicController extends Controller
{
    public function create(Topic $topic): RedirectResponse
    {
        return to_route('topics.show', $topic);
    }

    public function index(Request $request): Response
    {
        $topics = Topic::query()
            ->join('saved_topics', 'saved_topics.topic_id', '=', 'topics.id')
            ->where('saved_topics.user_id', $request->user()?->getAuthIdentifier())
            ->select('topics.*')
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage'])
            ->withCount(['methods', 'communitySaves as saves_count'])
            ->orderByDesc('saved_topics.created_at')
            ->orderByDesc('saved_topics.id')
            ->paginate(12);

        if ($topics->currentPage() > $topics->lastPage()) {
            return to_route('saved.index', ['page' => $topics->lastPage()]);
        }

        $response = Inertia::render('saved/index', [
            'topics' => $topics->through(fn (Topic $topic): array => [
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
            ]),
        ])->toResponse($request);

        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }

    public function store(Request $request, Topic $topic): RedirectResponse
    {
        SavedTopic::query()->firstOrCreate([
            'user_id' => $request->user()?->getAuthIdentifier(),
            'topic_id' => $topic->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Topic saved to your private list.')]);

        return back(fallback: route('topics.show', $topic));
    }

    public function destroy(Request $request, Topic $topic): RedirectResponse
    {
        SavedTopic::query()
            ->where('user_id', $request->user()?->getAuthIdentifier())
            ->where('topic_id', $topic->id)
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Topic removed from your saved list.')]);

        return back(fallback: route('topics.show', $topic));
    }
}
