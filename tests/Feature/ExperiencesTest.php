<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExperiencesTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'outcome' => 'partly',
            'body' => 'I tried this with a small shop. The repeated steps improved, but unusual files still needed manual work.',
            'tried_on' => '2025-01-15',
            'evidence_url' => 'https://example.com/public-evidence',
        ], $overrides);
    }

    public function test_anyone_can_read_experiences_without_private_author_data(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $method->experiences()->create($this->payload(['user_id' => $user->id]));

        $this->get(route('experiences.index', [$method->topic, $method]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('experiences/index')
                ->has('experiences.data', 1)
                ->where('experiences.data.0.user.name', $user->name)
                ->where('summary.partly', 1)
                ->where('summary.worked', 0)
                ->where('ownExperience', null)
                ->missing('experiences.data.0.user.email')
                ->missing('experiences.data.0.user.google_id')
                ->missing('method.user.email'));
    }

    public function test_guests_must_log_in_to_create_update_or_delete_an_experience(): void
    {
        $method = Method::factory()->create();
        $params = [$method->topic, $method];

        $this->get(route('experiences.create', $params))->assertRedirect(route('login'));
        $this->put(route('experiences.store', $params), $this->payload())->assertRedirect(route('login'));
        $this->delete(route('experiences.destroy', $params))->assertRedirect(route('login'));
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_signed_in_people_can_publish_with_server_owned_identity(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->put(route('experiences.store', [$method->topic, $method]), $this->payload([
                'user_id' => $other->id,
                'method_id' => 99999,
            ]))
            ->assertRedirect(route('experiences.index', [$method->topic, $method]));

        $this->assertDatabaseHas('experiences', [
            'method_id' => $method->id,
            'user_id' => $user->id,
            'outcome' => 'partly',
        ]);
        $this->assertDatabaseMissing('experiences', ['user_id' => $other->id]);

        $this->get(route('experiences.index', [$method->topic, $method]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('ownExperience.user.id', $user->id)
                ->where('ownExperience.tried_on', '2025-01-15'));
    }

    public function test_authors_cannot_validate_their_own_methods(): void
    {
        $method = Method::factory()->create();

        $this->actingAs($method->user)
            ->put(route('experiences.store', [$method->topic, $method]), $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_retrying_or_updating_replaces_one_experience_and_preserves_its_creation_date(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $params = [$method->topic, $method];
        $this->freezeTime();

        $this->actingAs($user)->put(route('experiences.store', $params), $this->payload())->assertRedirect();
        $first = Experience::query()->firstOrFail();
        $this->travel(1)->minutes();
        $this->put(route('experiences.store', $params), $this->payload(['outcome' => 'worked', 'evidence_url' => null]))->assertRedirect();
        $updated = Experience::query()->firstOrFail();

        $this->assertDatabaseCount('experiences', 1);
        $this->assertSame($first->id, $updated->id);
        $this->assertSame($first->created_at?->toIso8601String(), $updated->created_at?->toIso8601String());
        $this->assertSame('worked', $updated->outcome);
        $this->assertNull($updated->evidence_url);
        $this->get(route('experiences.index', $params))->assertInertia(fn (Assert $page) => $page
            ->where('summary.worked', 1)
            ->where('summary.partly', 0)
            ->where('experiences.total', 1));
    }

    public function test_deletion_only_removes_the_authenticated_persons_experience(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $other = User::factory()->create();
        $method->experiences()->create($this->payload(['user_id' => $user->id]));
        $method->experiences()->create($this->payload(['user_id' => $other->id]));

        $this->actingAs($user)->delete(route('experiences.destroy', [$method->topic, $method]), ['user_id' => $other->id])->assertRedirect();
        $this->assertDatabaseCount('experiences', 1);
        $this->assertDatabaseHas('experiences', ['user_id' => $other->id]);
        $this->delete(route('experiences.destroy', [$method->topic, $method]))->assertRedirect();
        $this->assertDatabaseCount('experiences', 1);
    }

    public function test_a_method_cannot_be_read_or_modified_through_another_topic(): void
    {
        $method = Method::factory()->create();
        $otherTopic = Topic::factory()->create();
        $params = [$otherTopic, $method];

        $this->get(route('experiences.index', $params))->assertNotFound();
        $this->actingAs(User::factory()->create());
        $this->get(route('experiences.create', $params))->assertNotFound();
        $this->put(route('experiences.store', $params), $this->payload())->assertNotFound();
        $this->delete(route('experiences.destroy', $params))->assertNotFound();
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_unsupported_outcomes_short_context_and_future_dates_are_rejected(): void
    {
        $method = Method::factory()->create();
        $this->actingAs(User::factory()->create())
            ->put(route('experiences.store', [$method->topic, $method]), $this->payload([
                'outcome' => 'verified',
                'body' => 'yes',
                'tried_on' => now()->addDay()->toDateString(),
            ]))
            ->assertSessionHasErrors(['outcome', 'body', 'tried_on']);
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_evidence_must_be_a_web_url_and_context_is_bounded(): void
    {
        $method = Method::factory()->create();
        $this->actingAs(User::factory()->create());
        foreach (['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com/file'] as $url) {
            $this->put(route('experiences.store', [$method->topic, $method]), $this->payload([
                'evidence_url' => $url,
                'body' => str_repeat('x', 5001),
            ]))->assertSessionHasErrors(['evidence_url', 'body']);
        }
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_all_three_outcomes_are_supported_and_optional_fields_can_be_omitted(): void
    {
        $method = Method::factory()->create();
        foreach (['worked', 'partly', 'did_not_work'] as $outcome) {
            $this->actingAs(User::factory()->create())
                ->put(route('experiences.store', [$method->topic, $method]), [
                    'outcome' => $outcome,
                    'body' => 'This is my actual experience with enough context to help someone else.',
                ])->assertSessionHasNoErrors()->assertRedirect();
        }
        $this->assertDatabaseCount('experiences', 3);
    }

    public function test_pagination_summary_and_own_experience_are_not_limited_to_the_current_page(): void
    {
        $method = Method::factory()->create();
        $users = User::factory()->count(11)->create();
        foreach ($users as $user) {
            $method->experiences()->create($this->payload(['user_id' => $user->id]));
        }
        $otherMethod = Method::factory()->create();
        $otherMethod->experiences()->create($this->payload(['user_id' => $users->first()->id]));

        $this->actingAs($users->last())
            ->get(route('experiences.index', [$method->topic, $method, 'page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('experiences.data', 1)
                ->where('experiences.total', 11)
                ->where('summary.partly', 11)
                ->where('ownExperience.user.id', $users->last()->id));

        $this->get(route('topics.show', $method->topic))->assertInertia(fn (Assert $page) => $page
            ->where('methods.0.experiences_count', 11));
    }

    public function test_deleting_a_method_removes_its_experiences(): void
    {
        $method = Method::factory()->create();
        $method->experiences()->create($this->payload(['user_id' => User::factory()->create()->id]));
        $method->delete();
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_contribution_rate_limit_is_enforced_without_creating_duplicates(): void
    {
        $method = Method::factory()->create();
        $this->actingAs(User::factory()->create());
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->put(route('experiences.store', [$method->topic, $method]), $this->payload())->assertRedirect();
        }
        $this->put(route('experiences.store', [$method->topic, $method]), $this->payload())->assertStatus(429);
        $this->assertDatabaseCount('experiences', 1);
    }
}
