<?php

namespace App\Http\Controllers;

use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
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

    public function show(Request $request, string $username): Response|RedirectResponse
    {
        $user = User::query()->where('username', Str::lower($username))->firstOrFail();

        if ($username !== $user->username) {
            return $this->redirectToUsername($request, $user);
        }

        $view = $request->query('view');
        $view = in_array($view, ['topics', 'methods', 'experiences'], true) ? $view : 'methods';
        $user->load('avatarImage')->loadCount(['topics', 'methods', 'experiences']);

        $query = match ($view) {
            'topics' => $user->topics(),
            'experiences' => $user->experiences()->with('method.topic:id,slug'),
            default => $user->methods()->with('topic:id,slug'),
        };

        $contributions = $query->latest()->orderByDesc('id')->paginate(10)
            ->appends(['view' => $view])
            ->through(function (Topic|Method|Experience $item): array {
                if ($item instanceof Topic) {
                    return [
                        'id' => $item->id,
                        'title' => $item->title,
                        'excerpt' => Str::limit($item->description ?? '', 240),
                        'href' => route('topics.show', $item, false),
                        'created_at' => $item->created_at?->toIso8601String(),
                        'outcome' => null,
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
                'counts' => [
                    'topics' => $user->topics_count ?? 0,
                    'methods' => $user->methods_count ?? 0,
                    'experiences' => $user->experiences_count ?? 0,
                ],
            ],
            'view' => $view,
            'contributions' => $contributions,
        ]);
    }

    private function redirectToUsername(Request $request, User $user): RedirectResponse
    {
        return redirect()->route('members.show', [
            'username' => $user->username,
            ...$request->only(['view', 'page']),
        ], 301);
    }
}
