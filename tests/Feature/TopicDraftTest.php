<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TopicDraftTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_person_can_carry_a_question_into_the_creation_form(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('topics.create', ['title' => '  How do you learn after work?  ']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/create')
                ->where('initialTitle', 'How do you learn after work?'));
        $this->assertDatabaseCount('topics', 0);
    }

    public function test_invalid_draft_types_are_ignored_and_long_drafts_are_bounded(): void
    {
        $this->actingAs(User::factory()->create());
        $this->get(route('topics.create', ['title' => ['invalid']]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->where('initialTitle', ''));
        $this->get(route('topics.create', ['title' => str_repeat('a', 500)]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->where('initialTitle', str_repeat('a', 160)));
        $this->assertDatabaseCount('topics', 0);
    }

    public function test_login_returns_to_the_exact_question_draft_without_publishing_it(): void
    {
        $user = User::factory()->create(['password' => Hash::make('draft-test-password')]);
        $url = route('topics.create', ['title' => 'What made your weekly work simpler?']);
        $this->get($url)->assertRedirect(route('login'));
        $this->post(route('login'), ['email' => $user->email, 'password' => 'draft-test-password'])->assertRedirect($url);
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('initialTitle', 'What made your weekly work simpler?'));
        $this->assertDatabaseCount('topics', 0);
    }
}
