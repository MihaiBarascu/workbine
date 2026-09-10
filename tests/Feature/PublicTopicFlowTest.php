<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicTopicFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_feed_exposes_real_method_counts_without_private_author_data(): void
    {
        $topic = Topic::factory()->create();
        Method::factory()->count(2)->create(['topic_id' => $topic->id]);

        $this->get(route('topics.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/index')
                ->where('view', 'latest')
                ->where('topics.data.0.id', $topic->id)
                ->where('topics.data.0.methods_count', 2)
                ->where('topics.data.0.user.name', $topic->user->name)
                ->missing('topics.data.0.user.email')
                ->missing('topics.data.0.user.google_id'));
    }

    public function test_unanswered_view_excludes_topics_with_methods(): void
    {
        $unanswered = Topic::factory()->create();
        $answered = Topic::factory()->create();
        Method::factory()->create(['topic_id' => $answered->id]);

        $this->get(route('topics.index', ['view' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('view', 'unanswered')
                ->has('topics.data', 1)
                ->where('topics.data.0.id', $unanswered->id)
                ->where('topics.data.0.methods_count', 0));
    }

    public function test_home_supports_the_same_discovery_filter(): void
    {
        $answered = Topic::factory()->create();
        Method::factory()->create(['topic_id' => $answered->id]);

        $this->get(route('home', ['view' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/index')
                ->where('view', 'unanswered')
                ->has('topics.data', 0));
    }

    public function test_unknown_filter_falls_back_to_latest_topics(): void
    {
        Topic::factory()->create();

        $this->get(route('topics.index', ['view' => 'unknown']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('view', 'latest')
                ->has('topics.data', 1));
    }

    public function test_pagination_keeps_the_filter_and_a_stable_order(): void
    {
        $topics = Topic::factory()->count(13)->create(['created_at' => now()]);
        $answered = Topic::factory()->create();
        Method::factory()->create(['topic_id' => $answered->id]);

        $this->get(route('topics.index', ['view' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 12)
                ->where('topics.last_page', 2)
                ->where('topics.data.0.id', $topics->last()?->id)
                ->where('topics.next_page_url', fn ($url) => is_string($url) && str_contains($url, 'view=unanswered')));

        $this->get(route('topics.index', ['view' => 'unanswered', 'page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('view', 'unanswered')
                ->has('topics.data', 1)
                ->where('topics.data.0.id', $topics->first()?->id)
                ->where('topics.prev_page_url', fn ($url) => is_string($url) && str_contains($url, 'view=unanswered')));
    }

    public function test_topic_detail_only_exposes_its_own_methods(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id]);
        Method::factory()->create();

        $this->get(route('topics.show', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/show')
                ->has('methods', 1)
                ->where('methods.0.id', $method->id)
                ->where('topic.methods_count', 1)
                ->missing('methods.0.user.email')
                ->missing('topic.user.email'));
    }

    public function test_login_returns_a_guest_to_the_method_they_wanted_to_share(): void
    {
        $topic = Topic::factory()->create();
        $user = User::factory()->create([
            'password' => Hash::make('a-test-only-password'),
        ]);

        $this->get(route('methods.create', $topic))
            ->assertRedirect(route('login'));

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'a-test-only-password',
        ])->assertRedirect(route('methods.create', $topic));

        $this->assertAuthenticatedAs($user);
    }

    public function test_sharing_the_first_method_removes_a_topic_from_the_unanswered_feed(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();

        $this->actingAs($user)
            ->post(route('methods.store', $topic), [
                'title' => 'Start with one real customer',
                'body' => 'I asked one customer to walk me through their process, then automated the repeated step.',
            ])
            ->assertRedirect(route('topics.show', $topic));

        $this->get(route('topics.show', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('methods', 1)
                ->where('methods.0.user.id', $user->id)
                ->where('topic.methods_count', 1));

        $this->get(route('topics.index', ['view' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 0));
    }
}
