<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountRequestLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_limits_attempts_per_ip_and_recovers_after_a_minute(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson(route('register.store'), [])->assertUnprocessable();
        }

        $this->postJson(route('register.store'), [])->assertTooManyRequests()->assertHeader('Retry-After');
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.2'])
            ->postJson(route('register.store'), [])->assertUnprocessable();

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1']);
        $this->travel(61)->seconds();
        $this->postJson(route('register.store'), [])->assertUnprocessable();
    }

    public function test_inertia_rate_limit_returns_to_the_form_with_a_useful_error(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson(route('register.store'), []);
        }

        $this->from(route('register'))->withHeader('X-Inertia', 'true')
            ->post(route('register.store'), [])->assertRedirect(route('register'))
            ->assertHeader('Retry-After')->assertSessionHasErrors('request');
    }

    public function test_password_email_limit_covers_changing_addresses_without_affecting_other_routes(): void
    {
        Notification::fake();
        $users = User::factory()->count(11)->create();

        foreach ($users->take(10) as $user) {
            $this->postJson(route('password.email'), ['email' => $user->email])->assertOk();
            Notification::assertSentTo($user, ResetPassword::class);
        }

        $this->postJson(route('password.email'), ['email' => $users->last()->email])
            ->assertTooManyRequests()->assertHeader('Retry-After');
        Notification::assertNotSentTo($users->last(), ResetPassword::class);

        $this->get(route('password.request'))->assertOk();
        $this->get(route('login'))->assertOk();
        $this->postJson(route('register.store'), [])->assertUnprocessable();
    }

    public function test_visitors_behind_trusted_proxies_have_separate_limits(): void
    {
        config(['trustedproxy.proxies' => '10.0.1.0/24']);
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.10'])
            ->withHeader('X-Forwarded-For', '192.0.2.1, 10.0.1.11');

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson(route('register.store'), [])->assertUnprocessable();
        }

        $this->postJson(route('register.store'), [])->assertTooManyRequests();
        $this->withHeader('X-Forwarded-For', '192.0.2.2, 10.0.1.11')
            ->postJson(route('register.store'), [])->assertUnprocessable();
    }

    public function test_untrusted_client_cannot_evade_limits_by_spoofing_forwarded_headers(): void
    {
        config(['trustedproxy.proxies' => '10.0.1.0/24']);
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1']);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withHeaders(['X-Forwarded-For' => '192.0.2.'.$attempt, 'CF-Connecting-IP' => '192.0.2.'.$attempt])
                ->postJson(route('register.store'), [])->assertUnprocessable();
        }

        $this->withHeaders(['X-Forwarded-For' => '192.0.2.100', 'CF-Connecting-IP' => '192.0.2.100'])
            ->postJson(route('register.store'), [])->assertTooManyRequests();
    }
}
