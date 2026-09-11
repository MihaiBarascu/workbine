<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SavedTopicsTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> */
    private function inertiaHeaders(): array
    {
        return [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(Request::create('/')) ?? '',
        ];
    }

    public function test_guests_cannot_read_or_change_saved_topics(): void
    {
        $topic = Topic::factory()->create();

        $this->get(route('saved.index'))->assertRedirect(route('login'));
        $this->put(route('saved.store', $topic))->assertRedirect(route('login'));
        $this->delete(route('saved.destroy', $topic))->assertRedirect(route('login'));

        $this->assertDatabaseCount('saved_topics', 0);
    }

    public function test_saving_is_idempotent_private_and_does_not_send_notifications(): void
    {
        Notification::fake();
        Mail::fake();
        $user = User::factory()->create();
        $topic = Topic::factory()->create();
        $otherTopic = Topic::factory()->create();

        $this->actingAs($user)
            ->from(route('topics.show', $topic))
            ->put(route('saved.store', $topic), [
                'user_id' => $topic->user_id,
                'topic_id' => $otherTopic->id,
            ])
            ->assertRedirect(route('topics.show', $topic));

        $saved = SavedTopic::query()->sole();
        $this->assertSame($user->id, $saved->user_id);
        $this->assertSame($topic->id, $saved->topic_id);

        $this->travel(1)->day();
        $this->put(route('saved.store', $topic))->assertRedirect();

        $this->assertDatabaseCount('saved_topics', 1);
        $this->assertEquals($saved->created_at, $saved->fresh()?->created_at);
        $this->assertEquals($saved->updated_at, $saved->fresh()?->updated_at);
        Notification::assertNothingSent();
        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }

    public function test_guest_save_link_preserves_the_topic_through_login_without_saving_on_get(): void
    {
        $topic = Topic::factory()->create();

        $this->get(route('saved.create', $topic))
            ->assertRedirect(route('login'))
            ->assertSessionHas('url.intended', route('saved.create', $topic));

        $this->actingAs(User::factory()->create())->get(route('saved.create', $topic))
            ->assertRedirect(route('topics.show', $topic));

        $this->assertDatabaseCount('saved_topics', 0);
    }

    public function test_topic_detail_exposes_only_the_current_members_saved_state(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);

        $this->get(route('topics.show', $topic))
            ->assertInertia(fn (Assert $page) => $page->where('saved', false));

        $this->actingAs($user)->get(route('topics.show', $topic))
            ->assertInertia(fn (Assert $page) => $page->where('saved', true));

        $this->actingAs(User::factory()->create())->get(route('topics.show', $topic))
            ->assertInertia(fn (Assert $page) => $page
                ->where('saved', false)
                ->missing('topic.saved_by'));
    }

    public function test_removing_a_saved_topic_only_affects_the_current_member_and_is_idempotent(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $topic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        SavedTopic::query()->create(['user_id' => $other->id, 'topic_id' => $topic->id]);

        $this->actingAs($user)
            ->from(route('saved.index'))
            ->delete(route('saved.destroy', $topic), ['user_id' => $other->id])
            ->assertRedirect(route('saved.index'));
        $this->delete(route('saved.destroy', $topic))->assertRedirect();

        $this->assertDatabaseMissing('saved_topics', ['user_id' => $user->id, 'topic_id' => $topic->id]);
        $this->assertDatabaseHas('saved_topics', ['user_id' => $other->id, 'topic_id' => $topic->id]);
        $this->assertDatabaseHas('topics', ['id' => $topic->id]);
    }

    public function test_saved_list_contains_only_the_members_own_topics_and_explicit_public_author_fields(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create(['google_id' => 'private-provider-id']);
        $ownSavedTopic = Topic::factory()->create(['user_id' => $other->id]);
        $otherSavedTopic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $ownSavedTopic->id]);
        SavedTopic::query()->create(['user_id' => $other->id, 'topic_id' => $otherSavedTopic->id]);

        $response = $this->actingAs($user)->get(route('saved.index', ['user_id' => $other->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('saved/index')
                ->has('topics.data', 1)
                ->where('topics.total', 1)
                ->where('topics.data.0.id', $ownSavedTopic->id)
                ->where('topics.data.0.user.id', $other->id)
                ->has('topics.data.0.updated_at')
                ->missing('topics.data.0.user.email')
                ->missing('topics.data.0.user.google_id')
                ->missing('topics.data.0.user.password')
                ->missing('topics.data.0.pivot')
                ->where('topics.data.0.saves_count', 1)
                ->missing('topics.data.0.saved_by'));

        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_saved_topics_are_paginated_by_saved_time_with_a_stable_tiebreaker(): void
    {
        $user = User::factory()->create();
        $topics = Topic::factory()->count(13)->create();

        foreach ($topics as $topic) {
            SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        }

        $this->actingAs($user)->get(route('saved.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 12)
                ->where('topics.total', 13)
                ->where('topics.data.0.id', $topics->last()?->id)
                ->where('topics.last_page', 2));

        $this->get(route('saved.index', ['page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 1)
                ->where('topics.data.0.id', $topics->first()?->id));
    }

    public function test_saved_list_encrypts_browser_history_and_logout_clears_its_key(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('saved.index'), $this->inertiaHeaders())
            ->assertOk()
            ->assertJsonPath('encryptHistory', true);

        $this->post(route('logout'))->assertRedirect(route('home'));
        $this->assertGuest();

        $this->get(route('home'), $this->inertiaHeaders())
            ->assertOk()
            ->assertJsonPath('clearHistory', true);
        $this->get(route('saved.index'))->assertRedirect(route('login'));
    }

    public function test_public_topics_do_not_require_encrypted_browser_history(): void
    {
        $this->get(route('topics.index'), $this->inertiaHeaders())
            ->assertOk()
            ->assertJsonMissingPath('encryptHistory');
    }

    public function test_account_deletion_also_clears_encrypted_saved_history(): void
    {
        $this->actingAs(User::factory()->create())
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertRedirect('/');
        $this->assertGuest();

        $this->get(route('home'), $this->inertiaHeaders())
            ->assertOk()
            ->assertJsonPath('clearHistory', true);
    }

    public function test_saving_an_older_topic_places_it_first(): void
    {
        $user = User::factory()->create();
        $olderTopic = Topic::factory()->create(['created_at' => now()->subYear()]);
        $newerTopic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $newerTopic->id]);

        $this->travel(1)->minute();
        $this->actingAs($user)->put(route('saved.store', $olderTopic))->assertRedirect();

        $this->get(route('saved.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('topics.data.0.id', $olderTopic->id)
                ->where('topics.data.1.id', $newerTopic->id));
    }

    public function test_a_member_can_view_an_empty_saved_list_and_invalid_pages_redirect_to_the_last_page(): void
    {
        $this->actingAs(User::factory()->create())->get(route('saved.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('saved/index')
                ->has('topics.data', 0)
                ->where('topics.total', 0));

        $this->get(route('saved.index', ['page' => 2]))
            ->assertRedirect(route('saved.index', ['page' => 1]));
    }

    public function test_missing_topics_cannot_be_saved_or_removed(): void
    {
        $this->actingAs(User::factory()->create());

        $this->put(route('saved.store', ['topic' => 'missing-topic']))->assertNotFound();
        $this->delete(route('saved.destroy', ['topic' => 'missing-topic']))->assertNotFound();

        $this->assertDatabaseCount('saved_topics', 0);
    }

    public function test_hidden_topics_are_excluded_from_saved_lists_and_cannot_be_saved(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        $topic->forceFill(['hidden_at' => now()])->save();

        $this->actingAs($user)->get(route('saved.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 0)
                ->where('topics.total', 0));
        $this->put(route('saved.store', $topic))->assertNotFound();
    }

    public function test_saves_are_removed_when_the_member_or_topic_is_deleted(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $topic = Topic::factory()->create();
        SavedTopic::query()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        SavedTopic::query()->create(['user_id' => $other->id, 'topic_id' => $topic->id]);

        $user->delete();
        $this->assertDatabaseCount('saved_topics', 1);

        $topic->delete();
        $this->assertDatabaseCount('saved_topics', 0);
    }
}
