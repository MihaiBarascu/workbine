<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_health_checks_and_errors_send_baseline_browser_protections(): void
    {
        config(['app.debug' => false]);

        foreach (['/', '/topics', '/login', '/up'] as $uri) {
            $this->get($uri)
                ->assertOk()
                ->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
                ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        }

        $this->get('/this-page-does-not-exist')
            ->assertNotFound()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    public function test_a_response_keeps_its_own_stricter_policy(): void
    {
        Route::get('/testing/frame-policy', fn () => response('ok')->header('X-Frame-Options', 'DENY'));

        $this->get('/testing/frame-policy')
            ->assertOk()
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}
