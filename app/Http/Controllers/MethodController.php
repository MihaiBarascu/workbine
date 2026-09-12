<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMethodRequest;
use App\Http\Requests\UpdateMethodRequest;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ContentModeration;
use App\Support\ContributionRevision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MethodController extends Controller
{
    public function edit(Request $request, Topic $topic, Method $method): Response
    {
        abort_unless($request->user()?->getAuthIdentifier() === $method->user_id, 403);

        return Inertia::render('topics/method-edit', [
            'topic' => $topic->only(['id', 'title', 'slug']),
            'method' => $method->only(['id', 'title', 'body', 'source_url']),
            'revision' => ContributionRevision::token($method),
        ]);
    }

    public function update(UpdateMethodRequest $request, Topic $topic, Method $method): RedirectResponse
    {
        $data = $request->validated();
        app(ContentModeration::class)->text($request->user(), Arr::only($data, ['title', 'body', 'source_url']), 'method:'.$method->id, 'body');

        DB::transaction(function () use ($method, $data): void {
            $current = Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();

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
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Method updated.')]);

        return redirect()->to(route('topics.show', $topic).'#method-'.$method->id);
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
