<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MethodsTest extends TestCase
{
    use RefreshDatabase;

    public function test_topic_page_lists_methods(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create([
            'topic_id' => $topic->id,
            'title' => 'Start with the smallest paid version',
        ]);

        $this->get(route('topics.show', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/show')
                ->has('methods', 1)
                ->where('methods.0.id', $method->id)
                ->where('methods.0.title', 'Start with the smallest paid version')
                ->where('topic.methods_count', 1));
    }

    public function test_guests_cannot_share_methods(): void
    {
        $topic = Topic::factory()->create();

        $this->post(route('methods.store', $topic), [
            'title' => 'A real method',
            'body' => 'This should require an authenticated user.',
        ])->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_share_methods(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();

        $response = $this->actingAs($user)->post(route('methods.store', $topic), [
            'title' => 'Build the smallest paid version first',
            'body' => 'I started with one painful workflow, found one customer willing to pay, and only automated the repeated parts.',
            'source_url' => 'https://example.com/source',
        ]);

        $response->assertRedirect(route('topics.show', $topic));

        $this->assertDatabaseHas('methods', [
            'topic_id' => $topic->id,
            'user_id' => $user->id,
            'title' => 'Build the smallest paid version first',
            'source_url' => 'https://example.com/source',
        ]);
    }

    public function test_method_requires_a_title_and_body(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();

        $this->actingAs($user)
            ->from(route('methods.create', $topic))
            ->post(route('methods.store', $topic), [
                'title' => '',
                'body' => '',
            ])
            ->assertRedirect(route('methods.create', $topic))
            ->assertSessionHasErrors(['title', 'body']);
    }

    public function test_method_source_must_be_http_or_https_url(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();

        $this->actingAs($user)
            ->post(route('methods.store', $topic), [
                'title' => 'A method',
                'body' => 'Useful details about how this worked.',
                'source_url' => 'javascript:alert(1)',
            ])
            ->assertSessionHasErrors('source_url');
    }
}
