<?php

namespace Tests\Feature;

use App\Models\Goal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GoalsTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_browse_goals(): void
    {
        Goal::factory()->create([
            'title' => 'How to build a SaaS with Gemini',
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('goals/index')
                ->has('goals.data', 1)
                ->where('goals.data.0.title', 'How to build a SaaS with Gemini'));
    }

    public function test_anyone_can_view_a_goal(): void
    {
        $goal = Goal::factory()->create();

        $this->get(route('goals.show', $goal))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('goals/show')
                ->where('goal.id', $goal->id)
                ->where('goal.slug', $goal->slug));
    }

    public function test_guests_cannot_create_goals(): void
    {
        $this->post(route('goals.store'), [
            'title' => 'A protected goal',
        ])->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_create_goals(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('goals.store'), [
            'title' => 'How to build a SaaS with Gemini',
            'description' => 'Compare practical approaches used by people who shipped a real product.',
        ]);

        $goal = Goal::query()->firstOrFail();

        $response->assertRedirect(route('goals.show', $goal));

        $this->assertDatabaseHas('goals', [
            'user_id' => $user->id,
            'title' => 'How to build a SaaS with Gemini',
            'slug' => 'how-to-build-a-saas-with-gemini',
        ]);
    }

    public function test_duplicate_goal_titles_receive_unique_slugs(): void
    {
        Goal::factory()->create([
            'title' => 'Learn Laravel',
            'slug' => 'learn-laravel',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)->post(route('goals.store'), [
            'title' => 'Learn Laravel',
        ])->assertRedirect();

        $this->assertDatabaseHas('goals', [
            'user_id' => $user->id,
            'slug' => 'learn-laravel-2',
        ]);
    }

    public function test_goal_title_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('goals.create'))
            ->post(route('goals.store'), ['title' => ''])
            ->assertRedirect(route('goals.create'))
            ->assertSessionHasErrors('title');
    }
}
