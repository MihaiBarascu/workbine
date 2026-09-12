<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TurnstileRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'https://community.example.test',
            'services.turnstile.enabled' => true,
            'services.turnstile.site_key' => 'test-site-key',
            'services.turnstile.secret_key' => 'test-secret-key',
        ]);
        Http::preventStrayRequests();
        Notification::fake();
    }

    /** @return array<string, string> */
    private function registration(): array
    {
        return [
            'name' => 'Test Member',
            'email' => 'member@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'cf-turnstile-response' => 'test-token',
        ];
    }

    public function test_registration_exposes_only_the_public_site_key(): void
    {
        $this->get(route('register'))->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('turnstileSiteKey', 'test-site-key'))
            ->assertDontSee('test-secret-key');
    }

    public function test_verified_token_allows_standard_registration_and_confirmation_email(): void
    {
        Http::fake(['challenges.cloudflare.com/*' => Http::response([
            'success' => true, 'hostname' => 'community.example.test', 'action' => 'register',
        ])]);

        $this->post(route('register.store'), $this->registration())->assertSessionHasNoErrors();

        $this->assertAuthenticated();
        $user = User::where('email', 'member@example.test')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
            && $request['secret'] === 'test-secret-key'
            && $request['response'] === 'test-token');
        Http::assertSentCount(1);
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function rejectedResponses(): array
    {
        return [
            'forged token' => [['success' => false, 'error-codes' => ['invalid-input-response']]],
            'expired or reused token' => [['success' => false, 'error-codes' => ['timeout-or-duplicate']]],
            'wrong hostname' => [['success' => true, 'hostname' => 'other.example.test', 'action' => 'register']],
            'wrong action' => [['success' => true, 'hostname' => 'community.example.test', 'action' => 'login']],
            'missing metadata' => [['success' => true]],
            'malformed response' => [[]],
        ];
    }

    /** @param array<string, mixed> $result */
    #[DataProvider('rejectedResponses')]
    public function test_rejected_verification_creates_no_account_or_email(array $result): void
    {
        Http::fake(['challenges.cloudflare.com/*' => Http::response($result)]);

        $this->from(route('register'))->post(route('register.store'), $this->registration())
            ->assertRedirect(route('register'))
            ->assertSessionHasErrors('cf-turnstile-response');

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }

    public function test_direct_post_without_a_token_cannot_bypass_verification(): void
    {
        $input = $this->registration();
        unset($input['cf-turnstile-response']);

        $this->postJson(route('register.store'), $input)
            ->assertUnprocessable()->assertJsonValidationErrors('cf-turnstile-response');

        Http::assertNothingSent();
        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }

    public function test_oversized_or_non_string_tokens_are_rejected_before_calling_cloudflare(): void
    {
        foreach ([str_repeat('a', 2049), ['unexpected']] as $token) {
            $this->postJson(route('register.store'), [...$this->registration(), 'cf-turnstile-response' => $token])
                ->assertUnprocessable()->assertJsonValidationErrors('cf-turnstile-response');
        }

        Http::assertNothingSent();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_cloudflare_timeout_returns_a_recoverable_form_error(): void
    {
        Http::fake(['challenges.cloudflare.com/*' => Http::failedConnection()]);

        $this->from(route('register'))->post(route('register.store'), $this->registration())
            ->assertRedirect(route('register'))
            ->assertSessionHasErrors(['cf-turnstile-response' => 'Verification is temporarily unavailable. Please try again.']);

        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }

    public function test_cloudflare_server_error_does_not_allow_registration(): void
    {
        Http::fake(['challenges.cloudflare.com/*' => Http::response('Unavailable', 503)]);

        $this->post(route('register.store'), $this->registration())->assertSessionHasErrors('cf-turnstile-response');

        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }

    public function test_enabled_but_missing_configuration_does_not_silently_disable_protection(): void
    {
        config(['services.turnstile.secret_key' => null]);

        $this->post(route('register.store'), $this->registration())->assertSessionHasErrors('cf-turnstile-response');

        Http::assertNothingSent();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_duplicate_email_keeps_the_existing_validation_without_consuming_the_token(): void
    {
        User::factory()->create(['email' => 'member@example.test']);

        $this->post(route('register.store'), $this->registration())->assertSessionHasErrors('email');

        Http::assertNothingSent();
        Notification::assertNothingSent();
    }

    public function test_disabled_integration_keeps_standard_registration_without_external_requests(): void
    {
        config(['services.turnstile.enabled' => false]);
        $input = $this->registration();
        unset($input['cf-turnstile-response']);

        $this->get(route('register'))->assertInertia(fn (Assert $page) => $page->where('turnstileSiteKey', null));
        $this->post(route('register.store'), $input)->assertSessionHasNoErrors();

        $this->assertAuthenticated();
        Http::assertNothingSent();
    }
}
