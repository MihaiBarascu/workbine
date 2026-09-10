<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TopicSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_matches_titles_and_descriptions_case_insensitively(): void
    {
        Topic::factory()->create(['title' => 'Build a SaaS', 'description' => 'A small product.']);
        Topic::factory()->create(['title' => 'First customer', 'description' => 'How I found a customer for a SaaS.']);
        Topic::factory()->create(['title' => 'An unrelated question', 'description' => null]);

        $this->get(route('topics.index', ['q' => '  SAAS  ']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('search', 'SAAS')
                ->has('topics.data', 2));
    }

    public function test_search_and_needs_a_method_filter_are_combined(): void
    {
        $unanswered = Topic::factory()->create(['title' => 'SaaS onboarding']);
        $answered = Topic::factory()->create(['title' => 'SaaS customers']);
        Method::factory()->create(['topic_id' => $answered->id]);
        Topic::factory()->create(['title' => 'Other', 'description' => null]);

        $this->get(route('topics.index', ['q' => 'SaaS', 'view' => 'unanswered']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 1)
                ->where('topics.data.0.id', $unanswered->id));
    }

    public function test_search_treats_wildcard_characters_as_literal_text(): void
    {
        $match = Topic::factory()->create(['title' => 'A 50%_! improvement', 'description' => null]);
        Topic::factory()->create(['title' => 'A 50000 improvement', 'description' => null]);

        $this->get(route('topics.index', ['q' => '50%_!']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 1)
                ->where('topics.data.0.id', $match->id));
    }

    public function test_search_survives_pagination(): void
    {
        Topic::factory()->count(13)->create(['title' => 'Find a customer']);

        $this->get(route('topics.index', ['q' => 'customer', 'view' => 'unanswered']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('topics.data', 12)
                ->where('topics.next_page_url', fn ($url) => is_string($url) && str_contains($url, 'q=customer') && str_contains($url, 'view=unanswered')));

        $this->get(route('topics.index', ['q' => 'customer', 'page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('search', 'customer')
                ->has('topics.data', 1));
    }

    public function test_empty_malformed_and_long_input_are_handled_safely(): void
    {
        Topic::factory()->create();
        foreach (['   ', ['invalid']] as $input) {
            $this->get(route('topics.index', ['q' => $input]))
                ->assertOk()->assertInertia(fn (Assert $page) => $page
                    ->where('search', '')
                    ->has('topics.data', 1));
        }
        $this->get(route('topics.index', ['q' => str_repeat('x', 500)]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('search', str_repeat('x', 120))
                ->has('topics.data', 0));
    }

    public function test_home_search_behaves_like_the_topics_route(): void
    {
        Topic::factory()->create(['title' => 'Learn from real experience']);
        $this->get(route('home', ['q' => 'real experience']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('search', 'real experience')
                ->has('topics.data', 1));
    }
}
