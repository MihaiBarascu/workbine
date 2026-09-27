<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function report(string $contentType, string $body): TestResponse
    {
        return $this->call('POST', route('csp.report'), server: ['CONTENT_TYPE' => $contentType], content: $body);
    }

    public function test_pages_report_violations_with_a_per_response_nonce_shared_by_their_scripts(): void
    {
        $response = $this->get('/')->assertOk()
            ->assertHeaderMissing('Content-Security-Policy')
            ->assertHeader('Reporting-Endpoints', 'csp="'.route('csp.report').'"');

        $this->assertSame(1, preg_match('/<script nonce="([^"]+)">/', (string) $response->getContent(), $match));
        $policy = (string) $response->headers->get('Content-Security-Policy-Report-Only');
        $this->assertStringContainsString("script-src 'self' 'nonce-{$match[1]}' https://challenges.cloudflare.com;", $policy);
        $this->assertStringContainsString("frame-ancestors 'self'", $policy);
        $this->assertStringContainsString('report-uri '.route('csp.report'), $policy);
        $this->assertNotSame($policy, $this->get('/')->headers->get('Content-Security-Policy-Report-Only'));
    }

    public function test_the_media_host_may_serve_images_and_non_html_responses_carry_no_policy(): void
    {
        config(['media.disk' => 'r2', 'filesystems.disks.r2.url' => 'https://media.example.test']);
        $this->assertStringContainsString(
            "img-src 'self' data: blob: https://*.googleusercontent.com https://media.example.test;",
            (string) $this->get('/')->headers->get('Content-Security-Policy-Report-Only'),
        );

        Route::get('/testing/json', fn () => response()->json(['ok' => true]));
        $this->get('/testing/json')->assertOk()->assertHeaderMissing('Content-Security-Policy-Report-Only');
    }

    public function test_reports_are_logged_without_paths_tokens_or_browser_extension_noise(): void
    {
        Log::spy();

        $this->report('application/csp-report', json_encode(['csp-report' => [
            'document-uri' => 'https://workbine.test/reset-password/secret-token?email=someone%40example.com',
            'violated-directive' => 'script-src-elem',
            'effective-directive' => 'script-src-elem',
            'blocked-uri' => 'https://tracker.example/collect.js?member=someone',
            'disposition' => 'report',
        ]], JSON_THROW_ON_ERROR))->assertNoContent()->assertCookieMissing((string) config('session.cookie'));

        $this->report('application/reports+json', json_encode([
            ['type' => 'csp-violation', 'body' => ['documentURL' => 'https://workbine.test/topics', 'effectiveDirective' => 'img-src', 'blockedURL' => 'data', 'disposition' => 'report']],
            ['type' => 'csp-violation', 'body' => ['documentURL' => 'https://workbine.test/', 'effectiveDirective' => 'script-src-elem', 'blockedURL' => 'chrome-extension://abc/inject.js']],
            ['type' => 'deprecation', 'body' => ['message' => 'Not a policy report.']],
        ], JSON_THROW_ON_ERROR))->assertNoContent();

        Log::shouldHaveReceived('warning')->twice();
        Log::shouldHaveReceived('warning')->with('Content Security Policy report', [
            'directive' => 'script-src-elem', 'blocked' => 'https://tracker.example', 'page' => 'password.reset', 'disposition' => 'report',
        ]);
        Log::shouldHaveReceived('warning')->with('Content Security Policy report', [
            'directive' => 'img-src', 'blocked' => 'data', 'page' => 'topics.index', 'disposition' => 'report',
        ]);
    }

    public function test_oversized_reports_are_ignored_and_each_visitor_is_rate_limited(): void
    {
        Log::spy();

        $this->report('application/csp-report', '{"csp-report":{"effective-directive":"img-src"}}'.str_repeat(' ', 16384))->assertNoContent();
        for ($sent = 1; $sent < 20; $sent++) {
            $this->report('application/csp-report', '{}')->assertNoContent();
        }
        $this->report('application/csp-report', '{}')->assertTooManyRequests();

        Log::shouldNotHaveReceived('warning');
    }
}
