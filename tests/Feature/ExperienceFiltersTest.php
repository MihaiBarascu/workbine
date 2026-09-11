<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExperienceFiltersTest extends TestCase
{
    use RefreshDatabase;

    private function experience(Method $method, string $outcome, ?User $user = null): Experience
    {
        return $method->experiences()->create([
            'user_id' => ($user ?? User::factory()->create())->id,
            'outcome' => $outcome,
            'body' => 'A specific account of trying this approach in a small project.',
        ]);
    }

    public function test_each_supported_outcome_filters_the_list_without_changing_summary_counts(): void
    {
        $method = Method::factory()->create();
        $this->experience(Method::factory()->create(), 'worked');
        foreach (['worked', 'partly', 'did_not_work'] as $outcome) {
            $this->experience($method, $outcome);
        }

        foreach (['worked', 'partly', 'did_not_work'] as $outcome) {
            $this->get(route('experiences.index', [$method->topic, $method, 'outcome' => $outcome]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('outcome', $outcome)
                    ->has('experiences.data', 1)
                    ->where('experiences.total', 1)
                    ->where('experiences.data.0.outcome', $outcome)
                    ->where('summary', ['worked' => 1, 'partly' => 1, 'did_not_work' => 1])
                    ->missing('experiences.data.0.user.email'));
        }
    }

    public function test_default_and_malformed_filters_show_all_outcomes(): void
    {
        $method = Method::factory()->create();
        $this->experience($method, 'worked');
        $this->experience($method, 'partly');

        foreach ([null, '', 'all', 'invalid', ['worked']] as $outcome) {
            $this->get(route('experiences.index', [$method->topic, $method, 'outcome' => $outcome]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('outcome', 'all')
                    ->has('experiences.data', 2)
                    ->where('experiences.total', 2));
        }
    }

    public function test_pagination_preserves_the_filter_and_own_experience_is_independent(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $own = $this->experience($method, 'partly', $user);
        $first = $this->experience($method, 'worked');
        foreach (range(1, 10) as $index) {
            $this->experience($method, 'worked');
        }

        $this->actingAs($user)->get(route('experiences.index', [$method->topic, $method, 'outcome' => 'worked']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('experiences.data', 10)
                ->where('experiences.total', 11)
                ->where('experiences.next_page_url', fn ($url) => is_string($url) && str_contains($url, 'outcome=worked'))
                ->where('summary.worked', 11)
                ->where('summary.partly', 1)
                ->where('ownExperience.id', $own->id)
                ->where('ownExperience.outcome', 'partly'));

        $this->get(route('experiences.index', [$method->topic, $method, 'outcome' => 'worked', 'page' => 2]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('outcome', 'worked')
                ->has('experiences.data', 1)
                ->where('experiences.data.0.id', $first->id)
                ->where('ownExperience.id', $own->id));
    }

    public function test_a_filter_with_no_matches_preserves_the_summary_and_own_editor(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $own = $this->experience($method, 'partly', $user);

        $this->actingAs($user)->get(route('experiences.index', [$method->topic, $method, 'outcome' => 'worked']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('outcome', 'worked')
                ->has('experiences.data', 0)
                ->where('summary.partly', 1)
                ->where('summary.worked', 0)
                ->where('ownExperience.id', $own->id));
    }

    public function test_hidden_experiences_stay_out_of_filters_and_summary_and_keep_the_hidden_owner_state(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $this->experience($method, 'worked', $user)->forceFill(['hidden_at' => now()])->save();
        $this->experience($method, 'partly');

        $this->actingAs($user)->get(route('experiences.index', [$method->topic, $method, 'outcome' => 'worked']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('experiences.data', 0)
                ->where('summary.worked', 0)
                ->where('summary.partly', 1)
                ->where('ownExperience', null)
                ->where('ownExperienceHidden', true));
    }
}
