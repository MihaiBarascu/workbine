<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExperienceRequest;
use App\Models\CommunityNotification;
use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ContentModeration;
use App\Services\ImageUploads;
use App\Support\ContributionRevision;
use App\Support\RichText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

class ExperienceController extends Controller
{
    public function index(Request $request, Topic $topic, Method $method): RedirectResponse
    {
        $input = $request->query('outcome');
        $outcome = is_string($input) && in_array($input, ['worked', 'partly', 'did_not_work'], true) ? $input : 'all';
        $query = [];
        if ($outcome !== 'all') {
            $query['outcome'] = $outcome;
        }
        $page = $request->query('page');
        if (is_string($page) && ctype_digit($page) && (int) $page > 0) {
            $query['page'] = (int) $page;
        }

        return redirect()->to(route('methods.show', [$topic, $method, ...$query]));
    }

    public function create(Topic $topic, Method $method): RedirectResponse
    {
        return redirect()->to(route('methods.show', [$topic, $method]).'#share');
    }

    public function store(StoreExperienceRequest $request, Topic $topic, Method $method, ImageUploads $uploads): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        abort_if(Experience::withoutGlobalScopes()->where('method_id', $method->id)
            ->where('user_id', $user->id)->whereNotNull('hidden_at')->exists(), 403);
        app(ContentModeration::class)->text($user, Arr::only($data, ['body', 'evidence_url']), 'experience:'.$method->id, 'body');

        $image = $request->hasFile('evidence_image') ? $uploads->store($user, $request->file('evidence_image'), 'evidence_image') : null;

        try {
            $previous = DB::transaction(function () use ($user, $method, $request, $data, $image): ?MediaImage {
                // Serializes creation, replacement and quota reservations for one member.
                User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                // Same lock as method editing: publication and rewriting cannot cross.
                $current = Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();
                if (! hash_equals(ContributionRevision::token($current), $data['method_revision'])) {
                    throw ValidationException::withMessages(['method_revision' => __('The method changed while you were writing. Review the method before sharing your result.')]);
                }
                $experience = Experience::withoutGlobalScopes()->lockForUpdate()->firstOrNew(['method_id' => $method->id, 'user_id' => $user->id]);
                abort_if($experience->hidden_at !== null, 403);
                $previous = null;

                if ($image !== null || $request->boolean('remove_evidence_image')) {
                    $previous = $experience->evidenceImage;
                    $experience->evidence_image_id = $image?->id;
                }

                $experience->fill([
                    'outcome' => $data['outcome'],
                    'body' => $data['body'],
                    'evidence_url' => $data['evidence_url'] ?? null,
                    'tried_on' => $data['tried_on'] ?? null,
                ])->save();
                RichText::save($experience, $data['body_document'] ?? null);
                CommunityNotification::forExperience($experience);
                $previous?->update(['pending_deletion' => true]);

                return $previous;
            });
        } catch (Throwable $exception) {
            $uploads->discard($image);
            throw $exception;
        }

        $uploads->discard($previous);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your response has been saved.')]);

        return redirect()->to(route('methods.show', [$topic, $method]).'#experiences');
    }

    public function destroy(Request $request, Topic $topic, Method $method, ImageUploads $uploads): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $previous = DB::transaction(function () use ($user, $method): ?MediaImage {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $experience = $method->experiences()->withoutGlobalScopes()->where('user_id', $user->id)->first();
            $previous = $experience?->evidenceImage;
            $experience?->delete();
            $previous?->update(['pending_deletion' => true]);

            return $previous;
        });
        $uploads->discard($previous);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your response has been removed.')]);

        return redirect()->to(route('methods.show', [$topic, $method]).'#experiences');
    }
}
