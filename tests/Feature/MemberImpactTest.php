<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MemberImpactTest extends TestCase
{
    use RefreshDatabase;

    public function test_impact_counts_reported_results_and_links_to_the_supporting_experiences(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $method = Method::factory()->for($author)->for($topic)->create();
        foreach (['worked', 'worked', 'partly', 'did_not_work'] as $outcome) {
            $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => $outcome, 'body' => 'An actual trial with context and useful limitations.']);
        }
        SavedTopic::query()->create(['user_id' => User::factory()->create()->id, 'topic_id' => $topic->id]);
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page
            ->where('member.impact', ['methods_tried' => 1, 'worked' => 2, 'partly' => 1, 'topic_saves' => 1])
            ->where('contributions.data.0.feedback', [
                'total' => 4, 'worked' => 2, 'partly' => 1, 'did_not_work' => 1,
                'url' => route('experiences.index', [$topic, $method], false),
            ]));
    }

    public function test_impact_filters_select_matching_methods_and_saved_topics(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $worked = Method::factory()->for($author)->for($topic)->create();
        $failed = Method::factory()->for($author)->for($topic)->create();
        Method::factory()->for($author)->for($topic)->create();
        $worked->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'worked', 'body' => 'This worked in the situation I described.']);
        $failed->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'did_not_work', 'body' => 'This did not fit the situation I described.']);
        $this->get(route('members.show', ['username' => $author->username, 'impact' => 'worked']))->assertInertia(fn (Assert $page) => $page
            ->where('impact', 'worked')->has('contributions.data', 1)->where('contributions.data.0.id', $worked->id));
        $this->get(route('members.show', ['username' => $author->username, 'impact' => 'tried']))->assertInertia(fn (Assert $page) => $page->has('contributions.data', 2));
        $this->get(route('members.show', ['username' => $author->username, 'impact' => 'partly']))->assertInertia(fn (Assert $page) => $page->has('contributions.data', 0)->where('member.impact.methods_tried', 2));

        Topic::factory()->for($author)->create();
        SavedTopic::query()->create(['user_id' => User::factory()->create()->id, 'topic_id' => $topic->id]);
        $this->get(route('members.show', ['username' => $author->username, 'view' => 'topics', 'impact' => 'saved']))->assertInertia(fn (Assert $page) => $page
            ->has('contributions.data', 1)->where('contributions.data.0.id', $topic->id)->where('contributions.data.0.saves_count', 1));
    }

    public function test_filters_and_counts_exclude_hidden_content_and_self_validation(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->for($author)->create();
        $method = Method::factory()->for($author)->for($topic)->create();
        $method->experiences()->create(['user_id' => $author->id, 'outcome' => 'worked', 'body' => 'Self validation must never count toward public impact.']);
        $hidden = $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'worked', 'body' => 'Hidden outcome must never count toward public impact.']);
        $hidden->forceFill(['hidden_at' => now()])->save();
        SavedTopic::query()->create(['user_id' => $author->id, 'topic_id' => $topic->id]);
        $this->get(route('members.show', ['username' => $author->username, 'impact' => 'worked']))->assertInertia(fn (Assert $page) => $page
            ->has('contributions.data', 0)->where('member.impact', ['methods_tried' => 0, 'worked' => 0, 'partly' => 0, 'topic_saves' => 0]));
        $hidden->forceFill(['hidden_at' => null])->save();
        $topic->forceFill(['hidden_at' => now()])->save();
        $this->get(route('members.show', $author->username))->assertInertia(fn (Assert $page) => $page->where('member.impact.worked', 0)->has('contributions.data', 0));
    }

    public function test_invalid_or_mismatched_filters_fall_back_without_losing_public_access(): void
    {
        $author = User::factory()->create();
        foreach ([['impact' => ['worked']], ['impact' => 'unknown'], ['view' => 'experiences', 'impact' => 'worked'], ['view' => 'methods', 'impact' => 'saved']] as $query) {
            $this->get(route('members.show', ['username' => $author->username, ...$query]))->assertInertia(fn (Assert $page) => $page->where('impact', ''));
        }
    }

    public function test_pagination_and_username_redirect_preserve_impact_filter(): void
    {
        $author = User::factory()->create();
        $methods = Method::factory()->for($author)->count(11)->create();
        foreach ($methods as $method) {
            $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'partly', 'body' => 'This helped partly in my practical trial.']);
        }
        $this->get(route('members.show', ['username' => $author->username, 'impact' => 'partly', 'page' => 2]))->assertInertia(fn (Assert $page) => $page
            ->has('contributions.data', 1)->where('member.impact.partly', 11)
            ->where('contributions.prev_page_url', fn (string $url) => str_contains($url, 'impact=partly')));
        $this->get(route('members.show', ['username' => strtoupper($author->username), 'impact' => 'partly']))
            ->assertRedirect(route('members.show', ['username' => $author->username, 'impact' => 'partly']));
    }
}
