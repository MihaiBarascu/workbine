<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use App\Support\ContributionRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ConnectedDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_members_can_classify_topics_and_filter_by_real_category_and_tag(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/topics', ['title' => 'Practice every day', 'category' => 'ai', 'tags' => 'Small habits, practice, practice'])->assertSessionHasNoErrors();
        $topic = Topic::query()->firstOrFail();
        $this->assertSame('ai', $topic->category);
        $this->assertSame(['small-habits', 'practice'], $topic->tags->pluck('name')->all());
        $this->get('/topics?category=ai&tag=practice')->assertInertia(fn (Assert $page) => $page
            ->has('topics.data', 1)
            ->where('topics.data.0.category', 'ai')
            ->where('topics.data.0.tags.0', 'small-habits')
            ->where('categories.ai', 'AI in Practice')
            ->missing('categories.ecommerce')
            ->where('categoryCounts.ai', 1));
        $this->get('/topics?category=ecommerce')->assertInertia(fn (Assert $page) => $page
            ->has('topics.data', 0)
            ->where('categories.ecommerce', 'E-commerce')
            ->missing('categoryCounts.ecommerce'));
        $this->get('/topics?tag=missing')->assertInertia(fn (Assert $page) => $page->has('topics.data', 0));
        $topic->forceFill(['hidden_at' => now()])->save();
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page
            ->has('categories', 0)
            ->has('availableTags', 0)
            ->missing('categoryCounts.ai'));
    }

    public function test_classification_edits_participate_in_conflict_detection_and_can_be_cleared(): void
    {
        $topic = Topic::factory()->create(['category' => 'ai']);
        $topic->tags()->create(['name' => 'practice']);
        $revision = ContributionRevision::token($topic);
        $this->actingAs($topic->user)->patch(route('topics.update', $topic), ['title' => $topic->title, 'category' => 'freelancing', 'tags' => 'interviews', 'revision' => $revision])->assertSessionHasNoErrors();
        $this->patch(route('topics.update', $topic), ['title' => 'Stale update', 'revision' => $revision])->assertSessionHasErrors('revision');
        $topic->refresh();
        $this->assertSame('freelancing', $topic->category);
        $this->patch(route('topics.update', $topic), ['title' => $topic->title, 'category' => '', 'tags' => '', 'revision' => ContributionRevision::token($topic)])->assertSessionHasNoErrors();
        $this->assertNull($topic->fresh()->category);
        $this->assertSame(0, $topic->tags()->count());
    }

    public function test_classification_is_optional_bounded_and_cannot_change_ownership(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/topics', ['title' => 'An independent topic'])->assertSessionHasNoErrors();
        $this->post('/topics', ['title' => 'Invalid category', 'category' => 'fake'])->assertSessionHasErrors('category');
        $this->post('/topics', ['title' => 'Too many tags', 'tags' => 'one,two,three,four'])->assertSessionHasErrors('tags');
        $this->post('/topics', ['title' => 'Long tag', 'tags' => str_repeat('a', 25)])->assertSessionHasErrors('tags.0');
        $this->post('/topics', ['title' => 'Duplicate tags', 'tags' => ['ai', 'ai']])->assertSessionHasErrors('tags.0');
        $topic = Topic::query()->firstOrFail();
        $this->actingAs(User::factory()->create())->patch(route('topics.update', $topic), ['title' => 'Changed', 'category' => 'freelancing', 'revision' => ContributionRevision::token($topic)])->assertForbidden();
        $this->assertDatabaseCount('topics', 1);
    }

    public function test_appreciations_are_unique_owned_verified_and_do_not_notify_or_change_saves(): void
    {
        $topic = Topic::factory()->create();
        $this->put(route('topics.like', $topic))->assertRedirect('/login');
        $this->actingAs(User::factory()->unverified()->create())->put(route('topics.like', $topic))->assertRedirect(route('verification.notice'));
        $member = User::factory()->create();
        $this->actingAs($member)->put(route('topics.like', $topic))->assertRedirect();
        $this->put(route('topics.like', $topic))->assertRedirect();
        $this->assertDatabaseCount('topic_likes', 1);
        $this->assertDatabaseCount('community_notifications', 0);
        $this->assertDatabaseCount('saved_topics', 0);
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.likes_count', 1)->where('topics.data.0.liked', true)->missing('topics.data.0.likers'));
        $this->actingAs($topic->user)->put(route('topics.like', $topic))->assertForbidden();
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.liked', false));
        $this->delete(route('topics.unlike', $topic))->assertRedirect();
        $this->assertDatabaseCount('topic_likes', 1);
        $this->actingAs($member)->delete(route('topics.unlike', $topic))->assertRedirect();
        $this->assertDatabaseCount('topic_likes', 0);
        $topic->forceFill(['hidden_at' => now()])->save();
        $this->put(route('topics.like', $topic))->assertNotFound();
    }

    public function test_rankings_use_visible_recent_methods_and_external_saves(): void
    {
        $old = Topic::factory()->create(['created_at' => now()->subDays(20)]);
        $recent = Topic::factory()->create();
        Method::factory()->create(['topic_id' => $old->id, 'created_at' => now()->subDay()]);
        Method::factory()->create(['topic_id' => $recent->id, 'created_at' => now()->subDays(15)]);
        $hidden = Method::factory()->create(['topic_id' => $recent->id]);
        $hidden->forceFill(['hidden_at' => now()])->save();
        SavedTopic::query()->create(['topic_id' => $recent->id, 'user_id' => $recent->user_id]);
        SavedTopic::query()->create(['topic_id' => $old->id, 'user_id' => User::factory()->create()->id]);
        foreach (['view=trending', 'view=saved', 'sort=oldest', 'sort=active'] as $filter) {
            $this->get('/topics?'.$filter)->assertInertia(fn (Assert $page) => $page->where('topics.data.0.id', $old->id));
        }
        $this->get('/topics?sort=newest')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.id', $recent->id));
    }

    public function test_people_search_is_public_literal_and_never_searches_or_serializes_email(): void
    {
        $member = User::factory()->create(['name' => 'Practice Partner', 'username' => 'practice-partner', 'email' => 'private-address@example.test']);
        $this->get('/topics?scope=people&q=practice')->assertInertia(fn (Assert $page) => $page->has('people.data', 1)->where('people.data.0.username', $member->username)->missing('people.data.0.email')->missing('people.data.0.google_id')->missing('people.data.0.two_factor_secret'));
        $this->get('/topics?scope=people&q=private-address')->assertInertia(fn (Assert $page) => $page->has('people.data', 0));
        $this->get('/topics?scope=people&q=%25')->assertInertia(fn (Assert $page) => $page->has('people.data', 0));
        $this->get('/topics?category[]=learning&tag[]=test&scope[]=people&sort[]=active')->assertOk()->assertInertia(fn (Assert $page) => $page->where('category', '')->where('tag', '')->where('sort', 'newest')->where('scope', 'topics'));
    }
}
