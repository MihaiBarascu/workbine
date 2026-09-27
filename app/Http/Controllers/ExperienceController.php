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
use App\Support\ExperienceRevision;
use App\Support\Photos;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

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

    public function store(StoreExperienceRequest $request, Topic $topic, Method $method): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        $existing = Experience::withoutGlobalScopes()->where('method_id', $method->id)
            ->where('user_id', $user->id)->first();
        abort_if($existing?->hidden_at !== null, 403);
        // Reject stale drafts before moderation, then check again under the write
        // locks in case the response changes meanwhile.
        ExperienceRevision::assertMatches($existing, $data['experience_revision']);
        app(ContentModeration::class)->text($user, [
            ...Arr::only($data, ['body', 'evidence_url']),
            'photo_captions' => Photos::captions($data['photos'] ?? []),
        ], 'experience:'.$method->id, 'body');

        DB::transaction(function () use ($user, $method, $data): void {
            // Serializes creation, replacement and quota reservations for one member.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Same lock as method editing: publication and rewriting cannot cross.
            $current = Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();
            if (! hash_equals(ContributionRevision::token($current), $data['method_revision'])) {
                throw ValidationException::withMessages(['method_revision' => __('The method changed while you were writing. Review the method before sharing your result.')]);
            }
            $experience = Experience::withoutGlobalScopes()->lockForUpdate()->firstOrNew(['method_id' => $method->id, 'user_id' => $user->id]);
            abort_if($experience->hidden_at !== null, 403);
            ExperienceRevision::assertMatches($experience, $data['experience_revision']);

            $experience->fill([
                'outcome' => $data['outcome'],
                'body' => $data['body'],
                'body_document' => $data['body_document'] ?? null,
                'evidence_url' => $data['evidence_url'] ?? null,
                'tried_on' => $data['tried_on'] ?? null,
            ])->save();
            if ($data['photos_present'] ?? false) {
                Photos::sync($experience, $data['photos'] ?? [], 'photos');
            }
            CommunityNotification::forExperience($experience);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your response has been saved.')]);

        return redirect()->to(route('methods.show', [$topic, $method]).'#experiences');
    }

    public function destroy(Request $request, Topic $topic, Method $method, ImageUploads $uploads): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate(['experience_revision' => ['required', 'string', 'max:64']]);
        $photos = DB::transaction(function () use ($user, $method, $data): Collection {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            Method::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();
            $experience = Experience::withoutGlobalScopes()->where('method_id', $method->id)
                ->where('user_id', $user->id)->lockForUpdate()->first();
            ExperienceRevision::assertMatches($experience, $data['experience_revision']);
            $photos = $experience === null ? new Collection : $experience->photos()->lockForUpdate()->get();
            MediaImage::query()->whereKey($photos->modelKeys())->update(['gallery_experience_id' => null, 'pending_deletion' => true]);
            $experience?->delete();

            return $photos;
        });
        // A removed response takes its photos with it now, not at the nightly cleanup.
        foreach ($photos as $photo) {
            $uploads->discard($photo);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your response has been removed.')]);

        return redirect()->to(route('methods.show', [$topic, $method]).'#experiences');
    }
}
