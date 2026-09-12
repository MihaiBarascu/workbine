<?php

namespace Tests\Feature\Auth;

use App\Models\Method;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AccountVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_one_confirmation_and_keeps_the_draft_through_verification(): void
    {
        Notification::fake();
        $draft = route('topics.create', ['title' => 'A topic worth sharing']);
        $this->get($draft)->assertRedirect(route('login'));
        $this->post(route('register.store'), [
            'name' => 'New Member', 'email' => 'new-member@example.com',
            'password' => 'password', 'password_confirmation' => 'password',
        ])->assertRedirect($draft);

        $user = User::query()->where('email', 'new-member@example.com')->firstOrFail();
        Notification::assertSentToTimes($user, VerifyEmail::class, 1);
        $this->assertFalse($user->hasVerifiedEmail());
        $this->get($draft)->assertRedirect(route('verification.notice'));
        $this->get(route('verification.notice'))->assertOk();
        $this->get($this->verificationLink($user))->assertRedirect($draft);
        $this->get($draft)->assertOk();
        $this->assertDatabaseCount('topics', 0);
    }

    public function test_unverified_members_cannot_publish_or_save_but_can_browse_and_manage_their_account(): void
    {
        $user = User::factory()->unverified()->create();
        $method = Method::factory()->create();
        $topic = $method->topic;
        $this->actingAs($user);
        $this->get(route('home'))->assertOk();
        $this->get(route('profile.edit'))->assertOk();
        $this->withSession(['auth.password_confirmed_at' => time()])
            ->get(route('security.edit'))->assertOk();
        $this->post(route('topics.store'), [])->assertRedirect(route('verification.notice'));
        $this->post(route('methods.store', $topic), [])->assertRedirect(route('verification.notice'));
        $this->put(route('experiences.store', [$topic, $method]), [])->assertRedirect(route('verification.notice'));
        $this->put(route('saved.store', $topic), [])->assertRedirect(route('verification.notice'));
        $this->postJson(route('topics.store'), [])->assertForbidden();
        $this->assertDatabaseCount('topics', 1);
        $this->assertDatabaseCount('experiences', 0);
        $this->assertDatabaseCount('saved_topics', 0);
        $this->delete(route('profile.destroy'), ['password' => 'password'])->assertRedirect(route('home'));
        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_duplicate_registration_does_not_overwrite_an_unverified_account(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $original = $user->refresh()->getAttributes();
        $this->post(route('register.store'), [
            'name' => 'Another Person', 'email' => $user->email,
            'password' => 'another-password', 'password_confirmation' => 'another-password',
        ])->assertSessionHasErrors('email');
        $this->assertSame($original, $user->fresh()->getAttributes());
        $this->assertDatabaseCount('users', 1);
        Notification::assertNothingSent();
    }

    public function test_changing_email_sends_confirmation_and_invalidates_the_previous_link(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $oldLink = $this->verificationLink($user);
        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name, 'email' => 'corrected@example.com',
        ])->assertSessionHas('status', 'verification-link-sent');
        $user->refresh();
        $this->assertFalse($user->hasVerifiedEmail());
        Notification::assertSentToTimes($user, VerifyEmail::class, 1);
        $this->get($oldLink)->assertForbidden();
        $this->get(route('topics.create'))->assertRedirect(route('verification.notice'));
        $this->get($this->verificationLink($user))->assertRedirect();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_expired_and_other_account_links_cannot_confirm_an_email(): void
    {
        $user = User::factory()->unverified()->create();
        $expired = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
            'id' => $user->id, 'hash' => sha1($user->email),
        ]);
        $this->actingAs($user)->get($expired)->assertForbidden();
        $this->actingAs(User::factory()->unverified()->create())
            ->get($this->verificationLink($user))->assertForbidden();
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_resending_requires_login_and_is_rate_limited(): void
    {
        Notification::fake();
        $this->post(route('verification.send'))->assertRedirect(route('login'));
        $user = User::factory()->unverified()->create();
        $this->actingAs($user);
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->post(route('verification.send'))->assertRedirect();
        }
        $this->post(route('verification.send'))->assertTooManyRequests();
        Notification::assertSentToTimes($user, VerifyEmail::class, 6);
    }

    private function verificationLink(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id, 'hash' => sha1($user->email),
        ]);
    }
}
