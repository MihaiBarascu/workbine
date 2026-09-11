<?php

namespace App\Http\Controllers;

use App\Models\Experience;
use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use App\Services\Reputation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function redirectFromId(Request $request, User $user): RedirectResponse
    {
        return $this->redirectToUsername($request, $user);
    }

    public function show(Request $request, string $username, Reputation $reputation): Response|RedirectResponse
    {
        $user = User::query()->where('username', Str::lower($username))->firstOrFail();

        if ($username !== $user->username) {
            return $this->redirectToUsername($request, $user);
        }

        $view = $request->query('view');
        $view = in_array($view, ['topics', 'methods', 'experiences'], true) ? $view : 'methods';
        $user->load('avatarImage')->loadCount(['topics', 'methods', 'experiences']);

        $impact = $request->query('impact');
        $impact = ($view === 'methods' && in_array($impact, ['tried', 'worked', 'partly'], true))
            || ($view === 'topics' && $impact === 'saved') ? $impact : '';
        $outcomes = Experience::query()->where('user_id', '!=', $user->id)
            ->whereHas('method', fn ($query) => $query->where('user_id', $user->id))
            ->select('outcome')->selectRaw('COUNT(*) as total')->groupBy('outcome')->pluck('total', 'outcome');
        $topicSaves = SavedTopic::query()->where('user_id', '<>', $user->id)
            ->whereHas('topic', fn ($query) => $query->where('user_id', $user->id))->count();

        $query = match ($view) {
            'topics' => $user->topics()->withCount('communitySaves as saves_count'),
            'experiences' => $user->experiences()->with('method.topic:id,slug'),
            default => $user->methods()->with('topic:id,slug')->withCount([
                'experiences as feedback_total' => fn ($query) => $query->where('user_id', '!=', $user->id),
                'experiences as feedback_worked' => fn ($query) => $query->where('user_id', '!=', $user->id)->where('outcome', 'worked'),
                'experiences as feedback_partly' => fn ($query) => $query->where('user_id', '!=', $user->id)->where('outcome', 'partly'),
                'experiences as feedback_did_not_work' => fn ($query) => $query->where('user_id', '!=', $user->id)->where('outcome', 'did_not_work'),
            ]),
        };

        if ($impact === 'saved') {
            $query->whereHas('communitySaves');
        } elseif ($impact !== '') {
            $query->whereHas('experiences', function ($query) use ($impact, $user): void {
                $query->where('user_id', '!=', $user->id);
                if ($impact !== 'tried') {
                    $query->where('outcome', $impact);
                }
            });
        }

        $contributions = $query->latest()->orderByDesc('id')->paginate(10)
            ->appends(['view' => $view, 'impact' => $impact])
            ->through(function (Topic|Method|Experience $item): array {
                if ($item instanceof Topic) {
                    return [
                        'id' => $item->id,
                        'title' => $item->title,
                        'excerpt' => Str::limit($item->description ?? '', 240),
                        'href' => route('topics.show', $item, false),
                        'created_at' => $item->created_at?->toIso8601String(),
                        'outcome' => null,
                        'feedback' => null,
                        'saves_count' => $item->saves_count ?? 0,
                    ];
                }

                $method = $item instanceof Experience ? $item->method : $item;

                return [
                    'id' => $item->id,
                    'title' => $method->title,
                    'excerpt' => Str::limit($item->body, 240),
                    'href' => $item instanceof Experience
                        ? route('experiences.index', [$method->topic, $method], false)
                        : route('topics.show', $method->topic, false).'#method-'.$method->id,
                    'created_at' => $item->created_at?->toIso8601String(),
                    'outcome' => $item instanceof Experience ? $item->outcome : null,
                    'saves_count' => null,
                    'feedback' => $item instanceof Method ? [
                        'total' => (int) $item->getAttribute('feedback_total'),
                        'worked' => (int) $item->getAttribute('feedback_worked'),
                        'partly' => (int) $item->getAttribute('feedback_partly'),
                        'did_not_work' => (int) $item->getAttribute('feedback_did_not_work'),
                        'url' => route('experiences.index', [$method->topic, $method], false),
                    ] : null,
                ];
            });

        return Inertia::render('members/show', [
            'member' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'avatar_url' => $user->avatarUrl(),
                'bio' => $user->bio,
                'location' => $user->location,
                'website' => $user->website,
                'joined' => $user->created_at?->format('F Y'),
                'reputation' => $reputation->forMember($user),
                'impact' => [
                    'methods_tried' => $user->methods()->whereHas('experiences', fn ($query) => $query->where('user_id', '!=', $user->id))->count(),
                    'worked' => (int) $outcomes->get('worked', 0),
                    'partly' => (int) $outcomes->get('partly', 0),
                    'topic_saves' => $topicSaves,
                ],
                'counts' => [
                    'topics' => $user->topics_count ?? 0,
                    'methods' => $user->methods_count ?? 0,
                    'experiences' => $user->experiences_count ?? 0,
                    'topic_saves' => $topicSaves,
                ],
            ],
            'view' => $view,
            'impact' => $impact,
            'contributions' => $contributions,
        ]);
    }

    private function redirectToUsername(Request $request, User $user): RedirectResponse
    {
        return redirect()->route('members.show', [
            'username' => $user->username,
            ...$request->only(['view', 'page', 'impact']),
        ], 301);
    }
}
