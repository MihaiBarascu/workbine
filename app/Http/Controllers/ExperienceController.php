<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExperienceRequest;
use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ImageUploads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ExperienceController extends Controller
{
    public function index(Request $request, Topic $topic, Method $method): Response
    {
        $input = $request->query('outcome');
        $outcome = is_string($input) && in_array($input, ['worked', 'partly', 'did_not_work'], true) ? $input : 'all';
        $method->load('user:id,name,username,avatar_image_id', 'user.avatarImage');
        $experiences = $method->experiences()
            ->when($outcome !== 'all', fn ($query) => $query->where('outcome', $outcome))
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage', 'evidenceImage'])
            ->latest('updated_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->appends($outcome === 'all' ? [] : ['outcome' => $outcome])
            ->through(fn (Experience $experience): array => $this->serialize($experience));

        $counts = $method->experiences()
            ->select('outcome')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('outcome')
            ->pluck('total', 'outcome');

        $own = $request->user() === null ? null : $method->experiences()
            ->with(['user:id,name,username,avatar_image_id', 'user.avatarImage', 'evidenceImage'])
            ->where('user_id', $request->user()->getAuthIdentifier())
            ->first();

        return Inertia::render('experiences/index', [
            'topic' => ['id' => $topic->id, 'title' => $topic->title, 'slug' => $topic->slug],
            'method' => [
                'id' => $method->id,
                'title' => $method->title,
                'user' => ['id' => $method->user->id, 'name' => $method->user->name, 'username' => $method->user->username, 'avatar_url' => $method->user->avatarUrl()],
            ],
            'experiences' => $experiences,
            'outcome' => $outcome,
            'ownExperience' => $own ? $this->serialize($own) : null,
            'ownExperienceHidden' => $request->user() !== null && Experience::withoutGlobalScopes()
                ->where('method_id', $method->id)->where('user_id', $request->user()->getAuthIdentifier())
                ->whereNotNull('hidden_at')->exists(),
            'summary' => [
                'worked' => (int) $counts->get('worked', 0),
                'partly' => (int) $counts->get('partly', 0),
                'did_not_work' => (int) $counts->get('did_not_work', 0),
            ],
        ]);
    }

    public function create(Topic $topic, Method $method): RedirectResponse
    {
        return redirect()->to(route('experiences.index', [$topic, $method]).'#share');
    }

    public function store(StoreExperienceRequest $request, Topic $topic, Method $method, ImageUploads $uploads): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();
        abort_if(Experience::withoutGlobalScopes()->where('method_id', $method->id)
            ->where('user_id', $user->id)->whereNotNull('hidden_at')->exists(), 403);

        $image = $request->hasFile('evidence_image') ? $uploads->store($user, $request->file('evidence_image'), 'evidence_image') : null;

        try {
            $previous = DB::transaction(function () use ($user, $method, $request, $data, $image): ?MediaImage {
                // Serializes creation, replacement and quota reservations for one member.
                User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
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
                $previous?->update(['pending_deletion' => true]);

                return $previous;
            });
        } catch (Throwable $exception) {
            $uploads->discard($image);
            throw $exception;
        }

        $uploads->discard($previous);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your experience has been saved.')]);

        return to_route('experiences.index', [$topic, $method]);
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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your experience has been removed.')]);

        return to_route('experiences.index', [$topic, $method]);
    }

    /** @return array<string, mixed> */
    private function serialize(Experience $experience): array
    {
        return [
            'id' => $experience->id,
            'outcome' => $experience->outcome,
            'body' => $experience->body,
            'evidence_url' => $experience->evidence_url,
            'evidence_image' => $experience->evidenceImage?->publicData(),
            'tried_on' => $experience->tried_on?->toDateString(),
            'created_at' => $experience->created_at?->toIso8601String(),
            'updated_at' => $experience->updated_at?->toIso8601String(),
            'user' => ['id' => $experience->user->id, 'name' => $experience->user->name, 'username' => $experience->user->username, 'avatar_url' => $experience->user->avatarUrl()],
        ];
    }
}
