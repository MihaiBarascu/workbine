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

class MethodController extends Controller
{
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

        return redirect()->to(route('topics.show', $topic).'#method-'.$method->id);
    }

    public function addUpdate(Request $request, Topic $topic, Method $method): RedirectResponse
    {
        abort_unless($request->user()?->getAuthIdentifier() === $method->user_id, 403);
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

        DB::transaction(function () use ($topic, $user, $data): void {
            $method = $topic->methods()->create([
                'user_id' => $user->id,
                'title' => $data['title'],
                'body' => $data['body'],
                'source_url' => $data['source_url'] ?? null,
            ]);

            RichText::save($method, $data['body_document'] ?? null);
            CommunityNotification::forMethod($method);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Method shared.'),
        ]);

        return to_route('topics.show', $topic);
    }
}
