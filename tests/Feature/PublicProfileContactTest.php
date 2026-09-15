<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicProfileContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_contact_details_are_opt_in_and_separate_from_account_email(): void
    {
        $user = User::factory()->create([
            'email' => 'private@example.test',
            'public_email' => 'public@example.test',
            'social_links' => [
                ['platform' => 'linkedin', 'url' => 'https://www.linkedin.com/in/example'],
                ['platform' => 'github', 'url' => 'https://github.com/example'],
            ],
        ]);

        $this->get(route('members.show', $user->username))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('member.public_email', 'public@example.test')
                ->where('member.social_links.0.platform', 'linkedin')
                ->where('member.social_links.0.url', 'https://www.linkedin.com/in/example')
                ->where('member.social_links.1.platform', 'github')
                ->missing('member.email'));
    }

    public function test_profile_owner_can_update_and_clear_public_contact_details(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'public_email' => 'contact@example.com',
            'social_links_present' => '1',
            'social_links' => [
                ['platform' => 'linkedin', 'url' => 'https://www.linkedin.com/in/example'],
                ['platform' => 'github', 'url' => 'https://github.com/example'],
            ],
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame('contact@example.com', $user->public_email);
        $this->assertSame('linkedin', $user->social_links[0]['platform']);
        $this->assertSame('https://github.com/example', $user->social_links[1]['url']);
        $this->assertSame($user->email, $user->getOriginal('email'));

        $this->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'public_email' => '',
            'social_links_present' => '1',
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertNull($user->public_email);
        $this->assertNull($user->social_links);
    }

    public function test_public_contact_validation_rejects_unsafe_or_duplicate_links(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'public_email' => 'not-an-email',
            'social_links_present' => '1',
            'social_links' => [
                ['platform' => 'linkedin', 'url' => 'javascript:alert(1)'],
                ['platform' => 'linkedin', 'url' => 'https://example.com/duplicate'],
                ['platform' => 'unknown', 'url' => 'https://example.com/unknown'],
            ],
        ])->assertSessionHasErrors([
            'public_email',
            'social_links.0.url',
            'social_links.1.platform',
            'social_links.2.platform',
        ]);

        $this->assertNull($user->fresh()->public_email);
        $this->assertNull($user->fresh()->social_links);
    }

    public function test_social_link_count_is_bounded(): void
    {
        $user = User::factory()->create();
        $links = collect(['linkedin', 'github', 'x', 'instagram', 'youtube', 'facebook'])
            ->map(fn (string $platform): array => [
                'platform' => $platform,
                'url' => 'https://example.com/'.$platform,
            ])->all();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'social_links_present' => '1',
            'social_links' => $links,
        ])->assertSessionHasErrors('social_links');
    }
}
