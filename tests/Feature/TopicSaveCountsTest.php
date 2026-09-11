<?php

namespace Tests\Feature;

use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TopicSaveCountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_and_authors_see_save_totals_without_saver_identities(): void
    {
        $topic = Topic::factory()->create();
        $saver = User::factory()->create([
            'name' => 'Private bookmark member',
            'username' => 'private-bookmark-member',
            'email' => 'private-bookmark-member@example.com',
        ]);
        $this->saveTopic($topic, $saver);
        $this->saveTopic($topic, User::factory()->create());
        $this->saveTopic($topic, $topic->user);

        $this->get(route('topics.show', $topic))->assertOk()
            ->assertDontSee($saver->name)->assertDontSee($saver->username)->assertDontSee($saver->email)
            ->assertInertia(fn (Assert $page) => $page
                ->where('topic.saves_count', 2)
                ->where('saved', false)
                ->missing('topic.community_saves')
                ->missing('topic.saved_by')
                ->missing('topic.saves'));

        $this->get(route('topics.index'))->assertOk()
            ->assertDontSee($saver->name)->assertDontSee($saver->username)->assertDontSee($saver->email)
            ->assertInertia(fn (Assert $page) => $page
                ->where('topics.data.0.saves_count', 2)
                ->missing('topics.data.0.community_saves')
                ->missing('topics.data.0.saved_by'));

        $this->actingAs($topic->user)->get(route('topics.show', $topic))->assertOk()
            ->assertDontSee($saver->name)->assertDontSee($saver->username)->assertDontSee($saver->email)
            ->assertInertia(fn (Assert $page) => $page
                ->where('topic.saves_count', 2)
                ->where('saved', true)
                ->missing('topic.saved_by'));
    }

    public function test_save_and_remove_actions_update_counts_without_counting_retries(): void
    {
        $topic = Topic::factory()->create();
        $member = User::factory()->create();
        $this->actingAs($member);

        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page->where('topic.saves_count', 0));
        $this->put(route('saved.store', $topic))->assertRedirect();
        $this->put(route('saved.store', $topic))->assertRedirect();
        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page->where('topic.saves_count', 1));
        $this->get(route('members.show', $topic->user->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 1));

        $this->delete(route('saved.destroy', $topic))->assertRedirect();
        $this->delete(route('saved.destroy', $topic))->assertRedirect();
        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page->where('topic.saves_count', 0));
        $this->get(route('topics.index'))->assertInertia(fn (Assert $page) => $page->where('topics.data.0.saves_count', 0));
        $this->get(route('members.show', $topic->user->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 0));
    }

    public function test_authors_can_bookmark_their_own_topics_without_increasing_public_counts(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($topic->user)->put(route('saved.store', $topic))->assertRedirect();
        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page
            ->where('saved', true)->where('topic.saves_count', 0));
        $this->get(route('saved.index'))->assertInertia(fn (Assert $page) => $page
            ->where('topics.data.0.id', $topic->id)->where('topics.data.0.saves_count', 0));
        $this->get(route('members.show', $topic->user->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 0));

        $this->assertDatabaseHas('saved_topics', ['topic_id' => $topic->id, 'user_id' => $topic->user_id]);
    }

    public function test_profile_totals_sum_saves_across_visible_topics_and_exclude_own_bookmarks(): void
    {
        $author = User::factory()->create();
        $saver = User::factory()->create(['name' => 'Private saver', 'username' => 'private-saver']);
        $first = Topic::factory()->create(['user_id' => $author->id]);
        $second = Topic::factory()->create(['user_id' => $author->id]);
        $hidden = Topic::factory()->create(['user_id' => $author->id]);
        $hidden->forceFill(['hidden_at' => now()])->save();

        foreach ([$first, $second, $hidden] as $topic) {
            $this->saveTopic($topic, $saver);
            $this->saveTopic($topic, $author);
        }
        $this->saveTopic($first, User::factory()->create());
        $this->saveTopic(Topic::factory()->create(), $author);

        $this->get(route('members.show', $author->username))->assertOk()
            ->assertDontSee($saver->name)->assertDontSee($saver->username)->assertDontSee($saver->email)
            ->assertInertia(fn (Assert $page) => $page
                ->where('member.counts.topics', 2)
                ->where('member.counts.topic_saves', 3)
                ->missing('member.saved_topics')
                ->missing('member.saved_by')
                ->missing('member.savers'));

        $first->forceFill(['hidden_at' => now()])->save();
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 1));
        $this->get(route('topics.show', $first))->assertNotFound();
        $first->forceFill(['hidden_at' => null])->save();
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 3));
    }

    public function test_account_and_topic_deletion_remove_the_corresponding_save_counts(): void
    {
        $author = User::factory()->create();
        $saver = User::factory()->create();
        $first = Topic::factory()->create(['user_id' => $author->id]);
        $second = Topic::factory()->create(['user_id' => $author->id]);
        $this->saveTopic($first, $saver);
        $this->saveTopic($second, $saver);
        $this->saveTopic($second, User::factory()->create());

        $saver->delete();
        $this->get(route('topics.show', $first))->assertInertia(fn (Assert $page) => $page->where('topic.saves_count', 0));
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 1));

        $second->delete();
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page->where('member.counts.topic_saves', 0));
    }

    private function saveTopic(Topic $topic, User $member): void
    {
        SavedTopic::query()->create(['topic_id' => $topic->id, 'user_id' => $member->id]);
    }
}
