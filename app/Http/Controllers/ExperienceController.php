<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExperienceRequest;
use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExperienceController extends Controller
{
    public function index(Request $request, Topic $topic, Method $method): Response
    {
        $method->load('user:id,name,username');
        $experiences = $method->experiences()
            ->with('user:id,name,username')
            ->latest('updated_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->through(fn (Experience $experience): array => $this->serialize($experience));

        $counts = $method->experiences()
            ->select('outcome')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('outcome')
            ->pluck('total', 'outcome');

        $own = $request->user() === null ? null : $method->experiences()
            ->with('user:id,name,username')
            ->where('user_id', $request->user()->getAuthIdentifier())
            ->first();

        return Inertia::render('experiences/index', [
            'topic' => ['id' => $topic->id, 'title' => $topic->title, 'slug' => $topic->slug],
            'method' => [
                'id' => $method->id,
                'title' => $method->title,
                'user' => ['id' => $method->user->id, 'name' => $method->user->name, 'username' => $method->user->username],
            ],
            'experiences' => $experiences,
            'ownExperience' => $own ? $this->serialize($own) : null,
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

    public function store(StoreExperienceRequest $request, Topic $topic, Method $method): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();

        // The unique key and upsert keep retries/concurrent submissions to one person's experience.
        Experience::query()->upsert([[
            'method_id' => $method->id,
            'user_id' => $user->id,
            'outcome' => $data['outcome'],
            'body' => $data['body'],
            'evidence_url' => $data['evidence_url'] ?? null,
            'tried_on' => $data['tried_on'] ?? null,
        ]], ['method_id', 'user_id'], ['outcome', 'body', 'evidence_url', 'tried_on', 'updated_at']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your experience has been saved.')]);

        return to_route('experiences.index', [$topic, $method]);
    }

    public function destroy(Request $request, Topic $topic, Method $method): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $method->experiences()->where('user_id', $user->id)->delete();

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
            'tried_on' => $experience->tried_on?->toDateString(),
            'created_at' => $experience->created_at?->toIso8601String(),
            'updated_at' => $experience->updated_at?->toIso8601String(),
            'user' => ['id' => $experience->user->id, 'name' => $experience->user->name, 'username' => $experience->user->username],
        ];
    }
}
