<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Notifications\AccountEmailChanged;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailChangeSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_in_session_alone_cannot_redirect_account_recovery(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'owner@example.com']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'intruder@example.com',
        ])->assertSessionHasErrors('current_password');

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'intruder@example.com',
            'current_password' => 'not-the-password',
        ])->assertSessionHasErrors('current_password');

        $user->refresh();
        $this->assertSame('owner@example.com', $user->email);
        $this->assertTrue($user->hasVerifiedEmail());
        Notification::assertNothingSent();
    }

    public function test_other_profile_details_change_without_a_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => 'Renamed Member',
            'email' => $user->email,
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

        $this->assertSame('Renamed Member', $user->refresh()->name);
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_the_previous_verified_address_is_told_about_the_change(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'previous@example.com']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'next@example.com',
            'current_password' => 'password',
        ])->assertSessionHasNoErrors()->assertSessionHas('status', 'verification-link-sent');

        $this->assertSame('next@example.com', $user->refresh()->email);
        $this->assertFalse($user->hasVerifiedEmail());
        Notification::assertSentToTimes($user, VerifyEmail::class, 1);
        Notification::assertSentOnDemand(
            AccountEmailChanged::class,
            fn (AccountEmailChanged $notification, array $channels, AnonymousNotifiable $notifiable): bool => $notifiable->routes['mail'] === 'previous@example.com',
        );
    }

    public function test_an_unverified_previous_address_is_not_contacted(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'typo@example.com']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'corrected@example.com',
            'current_password' => 'password',
        ])->assertSessionHasNoErrors();

        Notification::assertSentToTimes($user->refresh(), VerifyEmail::class, 1);
        Notification::assertSentOnDemandTimes(AccountEmailChanged::class, 0);
    }

    public function test_email_changes_are_limited_per_member(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        foreach (['first', 'second', 'third'] as $name) {
            $this->actingAs($user)->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $name.'@example.com',
                'current_password' => 'password',
            ])->assertSessionHasNoErrors();
        }

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'fourth@example.com',
            'current_password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertSame('third@example.com', $user->refresh()->email);
        Notification::assertSentToTimes($user, VerifyEmail::class, 3);

        $this->travel(61)->minutes();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'fourth@example.com',
            'current_password' => 'password',
        ])->assertSessionHasNoErrors();

        $this->assertSame('fourth@example.com', $user->refresh()->email);
    }

    public function test_one_address_cannot_be_moved_between_accounts_to_flood_it(): void
    {
        Notification::fake();
        $claim = fn (User $member) => $this->actingAs($member)->patch(route('profile.update'), [
            'name' => $member->name,
            'email' => 'target@example.com',
            'current_password' => 'password',
        ]);

        foreach (range(1, 3) as $round) {
            $member = User::factory()->create();
            $claim($member)->assertSessionHasNoErrors();
            // Release the address so another account can claim it.
            $member->refresh()->forceFill(['email' => "released-{$round}@example.com"])->save();
        }

        $claim(User::factory()->create())->assertSessionHasErrors('email');
        $this->assertDatabaseMissing('users', ['email' => 'target@example.com']);
        Notification::assertSentTimes(VerifyEmail::class, 3);
    }
}
