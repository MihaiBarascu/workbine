<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
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
        Notification::fake();
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'Workbine User',
            'email' => 'user@example.com',
            'avatar' => 'https://example.com/avatar.jpg',
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'user@example.com',
            'google_id' => 'google-123',
        ]);
        $this->assertTrue(User::query()->where('email', 'user@example.com')->firstOrFail()->hasVerifiedEmail());
        Notification::assertNothingSent();
        $this->get(route('topics.create'))->assertOk();
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
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticatedAs($user->fresh());
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'google_id' => 'google-existing',
        ]);
    }

    public function test_google_callback_does_not_link_or_verify_an_unverified_local_account(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'preclaimed@example.com',
            'google_id' => null,
            'password' => 'password-chosen-before-email-ownership',
        ]);
        $original = $user->refresh()->getAttributes();
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-real-email-owner',
            'email' => 'preclaimed@example.com',
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertSame($original, $user->refresh()->getAttributes());
        $this->assertDatabaseCount('users', 1);
    }

    public function test_google_callback_rejects_missing_or_empty_identifiers_without_selecting_a_local_account(): void
    {
        $user = User::factory()->create(['google_id' => null]);
        $original = $user->refresh()->getAttributes();

        foreach ([null, '', '   '] as $googleId) {
            Socialite::fake('google', SocialiteUser::fake([
                'id' => $googleId,
                'email' => $user->email,
                'email_verified' => true,
            ]));

            $this->get(route('google.callback'))->assertForbidden();
            $this->assertGuest();
            $this->assertSame($original, $user->refresh()->getAttributes());
            $this->assertDatabaseCount('users', 1);
        }
    }

    public function test_google_callback_cannot_replace_another_google_identity_with_the_same_email(): void
    {
        $user = User::factory()->create([
            'email' => 'linked@example.com',
            'google_id' => 'google-original-identity',
        ]);
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-different-identity',
            'email' => $user->email,
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))->assertStatus(409);

        $this->assertGuest();
        $this->assertSame('google-original-identity', $user->refresh()->google_id);
    }

    public function test_google_callback_rejects_unverified_email(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-unverified',
            'email' => 'unverified@example.com',
            'email_verified' => false,
        ]));

        $this->get(route('google.callback'))->assertForbidden();

        $this->assertGuest();
        $this->assertDatabaseMissing('users', [
            'email' => 'unverified@example.com',
        ]);
    }

    public function test_google_login_does_not_verify_an_unrelated_email_changed_in_profile_settings(): void
    {
        $user = User::factory()->create([
            'email' => 'google-owner@example.com',
            'google_id' => 'google-linked-member',
        ]);
        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'different-inbox@example.com',
        ])->assertSessionHasNoErrors()->assertRedirect();
        $this->assertNull($user->refresh()->email_verified_at);
        $this->post(route('logout'))->assertRedirect();

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-linked-member',
            'email' => 'google-owner@example.com',
            'email_verified' => true,
        ]));
        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticatedAs($user);
        $this->assertSame('different-inbox@example.com', $user->refresh()->email);
        $this->assertNull($user->email_verified_at);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_matching_google_email_verification_is_case_insensitive_for_a_linked_account(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'Member@example.com',
            'google_id' => 'google-case-member',
        ]);
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-case-member',
            'email' => 'member@example.com',
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticatedAs($user);
        $this->assertTrue($user->refresh()->hasVerifiedEmail());
    }

    public function test_google_login_preserves_independently_verified_local_email(): void
    {
        $user = User::factory()->create([
            'email' => 'confirmed-local@example.com',
            'google_id' => 'google-confirmed-member',
        ]);
        $verifiedAt = $user->email_verified_at?->toIso8601String();
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-confirmed-member',
            'email' => 'different-google@example.com',
            'email_verified' => true,
        ]));

        $this->get(route('google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticatedAs($user);
        $this->assertSame('confirmed-local@example.com', $user->refresh()->email);
        $this->assertSame($verifiedAt, $user->email_verified_at?->toIso8601String());
    }
}
