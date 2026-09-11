<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use App\Services\Reputation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReputationTest extends TestCase
{
    use RefreshDatabase;

    private function experience(Method $method, User $supporter, string $outcome = 'worked'): Experience
    {
        return $method->experiences()->create(['user_id' => $supporter->id, 'outcome' => $outcome, 'body' => 'A practical account of what happened during my trial.']);
    }

    private function save(Topic $topic, User $supporter): void
    {
        SavedTopic::query()->firstOrCreate(['topic_id' => $topic->id, 'user_id' => $supporter->id]);
    }

    public function test_posting_alone_earns_no_points_and_public_profile_explains_zero(): void
    {
        $author = User::factory()->create();
        Topic::factory()->for($author)->create();
        Method::factory()->for($author)->create();
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page
            ->where('member.reputation.score', 0)->where('member.reputation.supporters', 0));
        $this->get('/community/reputation')->assertOk();
    }

    public function test_verified_independent_saves_and_outcomes_earn_points_for_the_correct_author(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->for($topic)->create();
        $supporter = User::factory()->create();
        $this->save($topic, $supporter);
        $this->experience($method, $supporter);
        $scores = app(Reputation::class);
        $this->assertSame(1, $scores->forMember($topic->user)['score']);
        $this->assertSame(5, $scores->forMember($method->user)['score']);
        $this->get(route('members.show', $method->user->username))->assertInertia(fn (Assert $page) => $page
            ->where('member.reputation.worked', 1)->where('member.reputation.supporters', 1)
            ->missing('member.reputation.supporter_ids')->missing('member.reputation.supporter_emails'));
    }

    public function test_self_support_and_unverified_accounts_cannot_inflate_reputation(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $method = Method::factory()->for($author)->for($topic)->create();
        $unverified = User::factory()->unverified()->create();
        $this->save($topic, $author);
        $this->save($topic, $unverified);
        $this->experience($method, $author);
        $this->experience($method, $unverified);
        $scores = app(Reputation::class);
        $this->assertSame(0, $scores->forMember($author)['score']);
        $unverified->forceFill(['email_verified_at' => now()])->save();
        $this->assertSame(6, $scores->forMember($author)['score']);
        $unverified->forceFill(['email_verified_at' => null])->save();
        $this->assertSame(0, $scores->forMember($author)['score']);
    }

    public function test_points_recalculate_on_unsave_outcome_changes_and_experience_removal(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $method = Method::factory()->for($author)->for($topic)->create();
        $supporter = User::factory()->create();
        $this->save($topic, $supporter);
        $this->save($topic, $supporter);
        $experience = $this->experience($method, $supporter);
        $scores = app(Reputation::class);
        $this->assertSame(6, $scores->forMember($author)['score']);
        $experience->update(['outcome' => 'partly']);
        $this->assertSame(3, $scores->forMember($author)['score']);
        $experience->update(['outcome' => 'did_not_work']);
        $this->assertSame(1, $scores->forMember($author)['score']);
        $experience->update(['outcome' => 'worked']);
        $experience->delete();
        $this->assertSame(1, $scores->forMember($author)['score']);
        SavedTopic::query()->delete();
        $this->assertSame(0, $scores->forMember($author)['score']);
    }

    public function test_splitting_methods_within_one_topic_does_not_multiply_one_members_points(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $supporter = User::factory()->create();
        $this->save($topic, $supporter);
        foreach (['partly', 'worked', 'worked'] as $outcome) {
            $this->experience(Method::factory()->for($author)->for($topic)->create(), $supporter, $outcome);
        }
        $this->assertSame(['score' => 6, 'saves' => 1, 'worked' => 1, 'partly' => 0, 'supporters' => 1, 'limited_points' => 0], app(Reputation::class)->forMember($author));
    }

    public function test_one_supporters_points_are_capped_while_independent_support_can_grow(): void
    {
        $author = User::factory()->create();
        $supporter = User::factory()->create();
        foreach (range(1, 6) as $i) {
            $topic = Topic::factory()->for($author)->create();
            $this->save($topic, $supporter);
            $this->experience(Method::factory()->for($author)->for($topic)->create(), $supporter);
        }
        $scores = app(Reputation::class);
        $this->assertSame(['score' => 25, 'saves' => 6, 'worked' => 6, 'partly' => 0, 'supporters' => 1, 'limited_points' => 11], $scores->forMember($author));
        $this->save($topic, User::factory()->create());
        $this->assertSame(26, $scores->forMember($author)['score']);
    }

    public function test_hidden_content_and_deleted_supporters_cannot_leave_stale_points(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $method = Method::factory()->for($author)->for($topic)->create();
        $supporter = User::factory()->create();
        $this->save($topic, $supporter);
        $experience = $this->experience($method, $supporter);
        $scores = app(Reputation::class);
        $this->assertSame(6, $scores->forMember($author)['score']);
        $experience->forceFill(['hidden_at' => now()])->save();
        $this->assertSame(1, $scores->forMember($author)['score']);
        $experience->forceFill(['hidden_at' => null])->save();
        $method->forceFill(['hidden_at' => now()])->save();
        $this->assertSame(1, $scores->forMember($author)['score']);
        $method->forceFill(['hidden_at' => null])->save();
        $topic->forceFill(['hidden_at' => now()])->save();
        $this->assertSame(0, $scores->forMember($author)['score']);
        $topic->forceFill(['hidden_at' => null])->save();
        $this->assertSame(6, $scores->forMember($author)['score']);
        $supporter->delete();
        $this->assertSame(0, $scores->forMember($author)['score']);
    }
}
