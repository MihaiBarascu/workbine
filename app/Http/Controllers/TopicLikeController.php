<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use App\Models\TopicLike;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TopicLikeController extends Controller
{
    public function store(Request $request, Topic $topic): RedirectResponse
    {
        abort_if($request->user()?->getAuthIdentifier() === $topic->user_id, 403);
        TopicLike::query()->firstOrCreate(['user_id' => $request->user()?->getAuthIdentifier(), 'topic_id' => $topic->id]);

        return back(fallback: route('topics.show', $topic));
    }

    public function destroy(Request $request, Topic $topic): RedirectResponse
    {
        TopicLike::query()->where('user_id', $request->user()?->getAuthIdentifier())->where('topic_id', $topic->id)->delete();

        return back(fallback: route('topics.show', $topic));
    }
}
