<?php

namespace Tests\Feature;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TopicsTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_browse_topics(): void
    {
        Topic::factory()->create([
            'title' => 'How do you build a useful SaaS with Gemini?',
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/index')
                ->has('topics.data', 1)
                ->where('topics.data.0.title', 'How do you build a useful SaaS with Gemini?'));
    }

    public function test_anyone_can_view_a_topic(): void
    {
        $topic = Topic::factory()->create();

        $this->get(route('topics.show', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/show')
                ->where('topic.id', $topic->id)
                ->where('topic.slug', $topic->slug));
    }

    public function test_guests_cannot_create_topics(): void
    {
        $this->post(route('topics.store'), [
            'title' => 'A protected topic',
        ])->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_create_topics(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('topics.store'), [
            'title' => 'How do you build a useful SaaS with Gemini?',
            'description' => 'Compare practical approaches used by people who shipped a real product.',
        ]);

        $topic = Topic::query()->firstOrFail();

        $response->assertRedirect(route('topics.show', $topic));

        $this->assertDatabaseHas('topics', [
            'user_id' => $user->id,
            'title' => 'How do you build a useful SaaS with Gemini?',
            'slug' => 'how-do-you-build-a-useful-saas-with-gemini',
        ]);
    }

    public function test_duplicate_topic_titles_receive_unique_slugs(): void
    {
        Topic::factory()->create([
            'title' => 'Learn Laravel',
            'slug' => 'learn-laravel',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)->post(route('topics.store'), [
            'title' => 'Learn Laravel',
        ])->assertRedirect();

        $this->assertDatabaseHas('topics', [
            'user_id' => $user->id,
            'slug' => 'learn-laravel-2',
        ]);
    }

    public function test_topic_title_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('topics.create'))
            ->post(route('topics.store'), ['title' => ''])
            ->assertRedirect(route('topics.create'))
            ->assertSessionHasErrors('title');
    }

    public function test_legacy_goals_page_redirects_to_topics(): void
    {
        $this->get('/goals')->assertRedirect('/topics');
    }
}
