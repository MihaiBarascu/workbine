<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MemberProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profile_only_exposes_explicit_public_fields(): void
    {
        $user = User::factory()->create(['bio' => 'I simplify product imports.', 'location' => 'Pitesti', 'website' => 'https://example.com']);
        $this->get(route('members.show', $user))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('members/show')
                ->where('member.name', $user->name)
                ->where('member.bio', $user->bio)
                ->where('view', 'methods')
                ->where('member.counts.methods', 0)
                ->missing('member.email')
                ->missing('member.google_id')
                ->missing('member.password')
                ->missing('member.two_factor_secret')
                ->missing('member.avatar')
                ->has('contributions.data', 0));
    }

    public function test_profile_contributions_are_scoped_to_the_member(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create(['user_id' => $user->id]);
        $method = Method::factory()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        Method::factory()->create();
        Topic::factory()->create();
        $this->get(route('members.show', $user))->assertInertia(fn (Assert $page) => $page
            ->where('member.counts.methods', 1)
            ->has('contributions.data', 1)
            ->where('contributions.data.0.id', $method->id)
            ->where('contributions.data.0.href', '/topics/'.$topic->slug.'#method-'.$method->id)
            ->missing('contributions.data.0.user'));
        $this->get(route('members.show', [$user, 'view' => 'topics']))->assertInertia(fn (Assert $page) => $page
            ->where('view', 'topics')->has('contributions.data', 1)->where('contributions.data.0.id', $topic->id));
    }

    public function test_member_experiences_link_to_the_correct_method_without_private_data(): void
    {
        $user = User::factory()->create();
        $method = Method::factory()->create();
        $experience = Experience::query()->create(['user_id' => $user->id, 'method_id' => $method->id, 'outcome' => 'partly', 'body' => 'It helped but required adjustments to the inputs.']);
        $this->get(route('members.show', [$user, 'view' => 'experiences']))->assertInertia(fn (Assert $page) => $page
            ->where('member.counts.experiences', 1)
            ->has('contributions.data', 1)
            ->where('contributions.data.0.id', $experience->id)
            ->where('contributions.data.0.title', $method->title)
            ->where('contributions.data.0.outcome', 'partly')
            ->where('contributions.data.0.href', route('experiences.index', [$method->topic, $method], false))
            ->missing('contributions.data.0.method'));
    }

    public function test_public_profile_pagination_preserves_its_tab(): void
    {
        $user = User::factory()->create();
        $topics = Topic::factory()->count(11)->create(['user_id' => $user->id, 'created_at' => now()]);
        $this->get(route('members.show', [$user, 'view' => 'topics']))->assertInertia(fn (Assert $page) => $page
            ->has('contributions.data', 10)
            ->where('contributions.total', 11)
            ->where('contributions.data.0.id', $topics->last()?->id)
            ->where('contributions.next_page_url', fn ($url) => is_string($url) && str_contains($url, 'view=topics')));
        $this->get(route('members.show', [$user, 'view' => 'topics', 'page' => 2]))->assertInertia(fn (Assert $page) => $page
            ->has('contributions.data', 1)->where('contributions.data.0.id', $topics->first()?->id));
    }

    public function test_invalid_profile_tab_falls_back_and_missing_members_return_404(): void
    {
        $user = User::factory()->create();
        foreach (['invalid', ['bad']] as $view) {
            $this->get(route('members.show', [$user, 'view' => $view]))->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('view', 'methods'));
        }
        $this->get('/members/999999999')->assertNotFound();
        $this->get('/members/not-a-number')->assertNotFound();
    }

    public function test_only_authenticated_owner_can_update_public_profile_fields(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create(['bio' => 'Unchanged']);
        $data = ['name' => $user->name, 'email' => $user->email, 'bio' => 'Practical import workflows.', 'location' => 'Pitesti', 'website' => 'https://example.com', 'id' => $other->id, 'google_id' => 'tampered'];
        $this->patch(route('profile.update'), $data)->assertRedirect(route('login'));
        $this->actingAs($user)->patch(route('profile.update'), $data)->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
        $this->assertSame('Practical import workflows.', $user->fresh()?->bio);
        $this->assertSame('Unchanged', $other->fresh()?->bio);
        $this->assertNull($user->fresh()?->google_id);
    }

    public function test_profile_links_and_text_lengths_are_validated(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        foreach (['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com/file'] as $website) {
            $this->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'website' => $website, 'bio' => str_repeat('x', 501), 'location' => str_repeat('x', 101)])
                ->assertSessionHasErrors(['website', 'bio', 'location']);
        }
        $this->assertNull($user->fresh()?->website);
    }

    public function test_optional_fields_can_be_cleared_or_omitted_without_losing_existing_bio(): void
    {
        $user = User::factory()->create(['bio' => 'Existing bio']);
        $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email])->assertSessionHasNoErrors();
        $this->assertSame('Existing bio', $user->fresh()?->bio);
        $this->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'bio' => '', 'website' => '', 'location' => ''])->assertSessionHasNoErrors();
        $this->assertNull($user->fresh()?->bio);
    }
}
