<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMethodRequest;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class MethodController extends Controller
{
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

        $topic->methods()->create([
            'user_id' => $user->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'source_url' => $data['source_url'] ?? null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Method shared.'),
        ]);

        return to_route('topics.show', $topic);
    }
}
