<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_start_google_authentication(): void
    {
        Socialite::fake('google');

        $this->get(route('google.redirect'))->assertRedirect();
    }

    public function test_google_callback_creates_and_authenticates_user(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'Workbine User',
            'email' => 'user@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
            'user' => [
                'email_verified' => true,
            ],
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'user@example.com',
            'google_id' => 'google-123',
        ]);
    }

    public function test_google_callback_links_existing_user_by_verified_email(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'google_id' => null,
        ]);

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-existing',
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'user' => [
                'email_verified' => true,
            ],
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'google_id' => 'google-existing',
        ]);
    }
}
