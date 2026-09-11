<?php

namespace Tests\Feature\Auth;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OptionalEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{bool}> */
    public static function availability(): array
    {
        return ['available' => [true], 'unavailable' => [false]];
    }

    public function test_disabled_verification_sends_nothing_and_does_not_claim_success(): void
    {
        config(['community.email_verification_enabled' => false]);
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->withSession(['status' => 'verification-link-sent'])
            ->post(route('verification.send'))
            ->assertStatus(503)
            ->assertSessionMissing('status')
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/verify-email')
                ->where('verificationAvailable', false)
                ->where('status', null));

        $this->postJson(route('verification.send'))
            ->assertStatus(503)
            ->assertExactJson(['message' => 'Email verification is not available yet. You can continue using Workbine.']);

        Notification::assertNothingSent();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_guests_still_need_to_log_in_to_request_verification(): void
    {
        config(['community.email_verification_enabled' => false]);

        $this->post(route('verification.send'))->assertRedirect(route('login'));
    }

    #[DataProvider('availability')]
    public function test_profile_and_verification_prompt_expose_actual_availability(bool $available): void
    {
        config(['community.email_verification_enabled' => $available]);
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('mustVerifyEmail', $available)
                ->where('emailVerificationAvailable', $available));

        $this->get(route('verification.notice'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/verify-email')
                ->where('verificationAvailable', $available));

        Notification::assertNothingSent();
    }

    #[DataProvider('availability')]
    public function test_unverified_members_can_publish_edit_and_delete_their_accounts(bool $available): void
    {
        config(['community.email_verification_enabled' => $available]);
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->post(route('topics.store'), [
            'title' => 'A practical topic from an unverified member',
            'description' => 'Sharing a subject while email verification remains optional.',
        ])->assertRedirect();
        $topic = Topic::query()->where('user_id', $user->id)->firstOrFail();
        $this->get(route('topics.edit', $topic))->assertOk();

        $this->delete(route('profile.destroy'), ['password' => 'password'])->assertRedirect(route('home'));
        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    #[DataProvider('availability')]
    public function test_registration_does_not_automatically_send_email(bool $available): void
    {
        config(['community.email_verification_enabled' => $available]);
        Notification::fake();

        $this->post(route('register.store'), [
            'name' => 'New Member', 'email' => 'new-member@example.com',
            'password' => 'password', 'password_confirmation' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        Notification::assertNothingSent();
        $this->assertNull(User::query()->where('email', 'new-member@example.com')->firstOrFail()->email_verified_at);
    }

    public function test_an_existing_signed_verification_link_still_works_when_sending_is_disabled(): void
    {
        config(['community.email_verification_enabled' => false]);
        $user = User::factory()->unverified()->create();
        $link = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id, 'hash' => sha1($user->email),
        ]);

        $this->actingAs($user)->get($link)->assertRedirect();

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }
}
