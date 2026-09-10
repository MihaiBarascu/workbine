<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGoalRequest;
use App\Models\Goal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function index(): Response
    {
        $goals = Goal::query()
            ->with('user:id,name')
            ->latest()
            ->paginate(12)
            ->through(fn (Goal $goal): array => $this->serializeGoal($goal));

        return Inertia::render('goals/index', [
            'goals' => $goals,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('goals/create');
    }

    public function store(StoreGoalRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validated();

        $goal = $user->goals()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'slug' => $this->uniqueSlug($data['title']),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Goal published.'),
        ]);

        return to_route('goals.show', $goal);
    }

    public function show(Goal $goal): Response
    {
        $goal->load('user:id,name');

        return Inertia::render('goals/show', [
            'goal' => $this->serializeGoal($goal),
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeGoal(Goal $goal): array
    {
        return [
            'id' => $goal->id,
            'title' => $goal->title,
            'slug' => $goal->slug,
            'description' => $goal->description,
            'created_at' => $goal->created_at?->toIso8601String(),
            'user' => [
                'id' => $goal->user->id,
                'name' => $goal->user->name,
            ],
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'goal';
        $slug = $base;
        $suffix = 2;

        while (Goal::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
