<?php

namespace Tests\Feature;

use App\Models\CommunityNotification;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Support\ContributionRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CommunityNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_method_notifies_only_the_topic_owner_and_never_the_author(): void
    {
        $topic = Topic::factory()->create();
        $author = User::factory()->create();
        $this->actingAs($author)->post(route('methods.store', $topic), ['title' => 'My approach', 'body' => 'Start with a small repeatable step.'])->assertSessionHasNoErrors();
        $method = $topic->methods()->firstOrFail();
        $this->assertDatabaseHas('community_notifications', ['user_id' => $topic->user_id, 'actor_id' => $author->id, 'method_id' => $method->id, 'experience_id' => null]);
        $this->actingAs($topic->user)->post(route('methods.store', $topic), ['title' => 'My own approach', 'body' => 'This is how I do it myself.'])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('community_notifications', 1);
        $this->get('/notifications')->assertInertia(fn (Assert $page) => $page->component('notifications/index')->has('notifications.data', 1)->where('unreadNotifications', 1)->where('notifications.data.0.title', $topic->title)->where('notifications.data.0.actor.name', $author->name)->missing('notifications.data.0.actor.email'));
        $this->assertTrue($this->get('/notifications')->headers->hasCacheControlDirective('no-store'));
    }

    public function test_first_response_notifies_method_author_but_edits_and_self_responses_do_not(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $payload = ['method_revision' => ContributionRevision::token($method), 'outcome' => 'worked', 'body_document' => json_encode(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'It helped me get started.']]]]])];
        $this->actingAs($member)->put(route('experiences.store', [$method->topic, $method]), $payload)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('community_notifications', ['user_id' => $method->user_id, 'actor_id' => $member->id, 'experience_id' => $method->experiences()->firstOrFail()->id]);
        $this->put(route('experiences.store', [$method->topic, $method]), $payload)->assertSessionHasNoErrors();
        $this->actingAs($method->user)->put(route('experiences.store', [$method->topic, $method]), $payload)->assertForbidden();
        $this->assertDatabaseCount('community_notifications', 1);
    }

    public function test_guests_and_other_members_cannot_read_or_mark_someones_notifications(): void
    {
        $method = Method::factory()->create();
        CommunityNotification::forMethod($method);
        $item = CommunityNotification::query()->firstOrFail();
        $this->get('/notifications')->assertRedirect('/login');
        $this->post('/notifications/read')->assertRedirect('/login');
        $this->post('/notifications/'.$item->id.'/open')->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/notifications')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 0)->where('unreadNotifications', 0));
        $this->post('/notifications/'.$item->id.'/open')->assertNotFound();
        $this->post('/notifications/read')->assertRedirect('/notifications');
        $this->assertNull($item->fresh()->read_at);
        $this->actingAs($method->topic->user)->post('/notifications/'.$item->id.'/open')->assertRedirect(route('topics.show', $method->topic).'#method-'.$method->id);
        $this->assertNotNull($item->fresh()->read_at);
        $this->get('/notifications')->assertInertia(fn (Assert $page) => $page->where('unreadNotifications', 0)->where('notifications.data.0.read', true));
    }

    public function test_hidden_contributions_and_their_parents_disappear_from_notifications(): void
    {
        $method = Method::factory()->create();
        CommunityNotification::forMethod($method);
        $item = CommunityNotification::query()->firstOrFail();
        foreach ([$method, $method->topic] as $content) {
            $content->forceFill(['hidden_at' => now()])->save();
            $this->actingAs($method->topic->user)->get('/notifications')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 0)->where('unreadNotifications', 0));
            $this->post('/notifications/'.$item->id.'/open')->assertNotFound();
            $content->forceFill(['hidden_at' => null])->save();
        }
        $method->delete();
        $this->assertDatabaseCount('community_notifications', 0);
    }

    public function test_response_alert_opens_the_correct_page_and_hiding_or_deleting_response_removes_it(): void
    {
        $method = Method::factory()->create();
        $response = $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'worked', 'body' => 'An older response.']);
        CommunityNotification::forExperience($response);
        $item = CommunityNotification::query()->firstOrFail();
        for ($i = 0; $i < 11; $i++) {
            $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'partly', 'body' => 'A newer response.']);
        }
        $destination = route('experiences.index', [$method->topic, $method, 'page' => 2]).'#experience-'.$response->id;
        $this->actingAs($method->user)->post('/notifications/'.$item->id.'/open')->assertRedirect($destination);
        $this->get($destination)->assertInertia(fn (Assert $page) => $page->where('experiences.current_page', 2)->where('experiences.data.1.id', $response->id));
        $response->forceFill(['hidden_at' => now()])->save();
        $this->get('/notifications')->assertInertia(fn (Assert $page) => $page->has('notifications.data', 0));
        $this->post('/notifications/'.$item->id.'/open')->assertNotFound();
        $response->delete();
        $this->assertDatabaseCount('community_notifications', 0);
    }

    public function test_mark_all_is_owned_and_failed_contributions_never_create_alerts(): void
    {
        $method = Method::factory()->create();
        CommunityNotification::forMethod($method);
        $other = Method::factory()->create();
        CommunityNotification::forMethod($other);
        $this->actingAs($method->topic->user)->post('/notifications/read')->assertRedirect('/notifications');
        $this->assertNotNull(CommunityNotification::query()->where('method_id', $method->id)->firstOrFail()->read_at);
        $this->assertNull(CommunityNotification::query()->where('method_id', $other->id)->firstOrFail()->read_at);
        $this->post(route('methods.store', $other->topic), ['title' => 'Invalid document', 'body_document' => '{invalid'])->assertSessionHasErrors();
        $this->assertDatabaseCount('community_notifications', 2);
    }
}
