<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    public function test_pages_enforce_a_policy_with_a_per_response_nonce_shared_by_their_scripts(): void
    {
        $response = $this->get('/')->assertOk();

        $this->assertSame(1, preg_match('/<script nonce="([^"]+)">/', (string) $response->getContent(), $match));
        $policy = (string) $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("script-src 'self' 'nonce-{$match[1]}' https://challenges.cloudflare.com;", $policy);
        $this->assertStringContainsString("frame-ancestors 'self'", $policy);
        $this->assertStringContainsString("object-src 'none'", $policy);
        $this->assertNotSame($policy, $this->get('/')->headers->get('Content-Security-Policy'));
    }

    public function test_branded_error_pages_keep_their_back_button_script(): void
    {
        $response = $this->get('/this-page-does-not-exist')->assertNotFound();

        $this->assertSame(1, preg_match('/<script nonce="([^"]+)">/', (string) $response->getContent(), $match));
        $this->assertStringContainsString("'nonce-{$match[1]}'", (string) $response->headers->get('Content-Security-Policy'));
    }

    public function test_the_media_host_may_serve_images(): void
    {
        config(['media.disk' => 'r2', 'filesystems.disks.r2.url' => 'https://media.example.test']);

        $this->assertStringContainsString(
            "img-src 'self' data: blob: https://*.googleusercontent.com https://media.example.test;",
            (string) $this->get('/')->headers->get('Content-Security-Policy'),
        );
    }

    public function test_non_html_responses_and_debug_pages_carry_no_policy(): void
    {
        Route::get('/testing/json', fn () => response()->json(['ok' => true]));
        $this->get('/testing/json')->assertOk()->assertHeaderMissing('Content-Security-Policy');

        config(['app.debug' => true]);
        $this->get('/')->assertOk()->assertHeaderMissing('Content-Security-Policy');
    }
}
