<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HttpsProxyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['trustedproxy.proxies' => '10.0.1.0/24']);
    }

    public function test_trusted_proxy_generates_https_pagination_assets_and_secure_cookies(): void
    {
        $response = $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.10'])
            ->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->get('http://workbine.test/topics?q=practical');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('topics.path', 'https://workbine.test/topics')
            ->where('topics.first_page_url', 'https://workbine.test/topics?view=latest&q=practical&page=1'));

        $links = $response->headers->get('Link');
        $this->assertNotNull($links);
        $this->assertStringContainsString('https://workbine.test/build/', $links);
        $this->assertStringNotContainsString('http://', $links);
        $this->assertTrue(collect($response->headers->getCookies())
            ->first(fn ($cookie) => $cookie->getName() === config('session.cookie'))->isSecure());
    }

    public function test_untrusted_clients_cannot_spoof_https(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.20'])
            ->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->get('http://workbine.test/topics')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('topics.path', 'http://workbine.test/topics'));
    }

    public function test_forwarded_host_and_port_do_not_override_public_urls(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.10'])
            ->withHeaders([
                'X-Forwarded-Proto' => 'https',
                'X-Forwarded-Host' => 'attacker.test',
                'X-Forwarded-Port' => '80',
            ])
            ->get('http://workbine.test/topics')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('topics.path', 'https://workbine.test/topics'));
    }

    public function test_production_origin_does_not_duplicate_the_edge_redirect(): void
    {
        $this->app['env'] = 'production';
        config(['app.url' => 'https://workbine.test']);

        $this->get('http://workbine.test/topics?q=hello%20world')
            ->assertOk()
            ->assertHeaderMissing('Location');
    }

    public function test_production_https_does_not_loop_and_http_health_check_remains_available(): void
    {
        $this->app['env'] = 'production';
        config(['app.url' => 'https://workbine.test']);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.10'])
            ->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->get('http://workbine.test/topics')->assertOk();

        $this->flushHeaders()->get('http://localhost/up')->assertOk();
    }

    public function test_local_http_development_is_not_redirected(): void
    {
        $this->get('http://localhost/topics')->assertOk();
    }
}
