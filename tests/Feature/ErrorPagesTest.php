<?php

namespace Tests\Feature;

use App\Support\ErrorPages;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['app.debug' => false]);
    }

    /** @return array<string, array{int, string}> */
    public static function errors(): array
    {
        return [
            'forbidden' => [403, 'You cannot open this page'],
            'missing' => [404, 'This page could not be found'],
            'expired' => [419, 'Your session expired'],
            'throttled' => [429, 'Please slow down a little'],
            'server error' => [500, 'Something went wrong'],
            'unavailable' => [503, 'Workbine is temporarily unavailable'],
        ];
    }

    #[DataProvider('errors')]
    public function test_browser_errors_are_branded_and_keep_the_http_status(int $status, string $title): void
    {
        Route::get('/__error-test', fn () => abort($status, 'Internal exception detail'));

        $this->get('/__error-test')
            ->assertStatus($status)
            ->assertSee($title)
            ->assertSee('Workbine home')
            ->assertSee('Browse topics')
            ->assertSee('name="robots" content="noindex"', false)
            ->assertDontSee('Internal exception detail')
            ->assertDontSee('/build/assets/')
            ->assertHeaderMissing('X-Inertia');
    }

    #[DataProvider('errors')]
    public function test_inertia_errors_are_pages_without_private_shared_data(int $status, string $title): void
    {
        Inertia::share('sensitive', fn () => throw new RuntimeException('Shared data must not be resolved'));
        Route::get('/__error-test', fn () => abort($status, 'Internal exception detail'));

        $this->get('/__error-test', ['X-Inertia' => 'true', 'Accept' => 'text/html'])
            ->assertStatus($status)
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'errors/show')
            ->assertJsonPath('props.status', $status)
            ->assertJsonPath('props.title', $title)
            ->assertJsonMissingPath('props.sensitive')
            ->assertJsonMissingPath('props.auth')
            ->assertDontSee('Internal exception detail');
    }

    public function test_missing_routes_are_branded_before_web_middleware_runs(): void
    {
        $this->get('/this-route-does-not-exist')->assertNotFound()->assertSee('This page could not be found');

        $this->get('/this-route-does-not-exist', ['X-Inertia' => 'true', 'Accept' => 'text/html'])
            ->assertNotFound()
            ->assertJsonPath('component', 'errors/show')
            ->assertJsonPath('props.status', 404);
    }

    public function test_json_and_api_errors_keep_their_json_contract(): void
    {
        Route::get('/__error-test', fn () => abort(403, 'This action is not permitted.'));

        $this->getJson('/__error-test')
            ->assertForbidden()
            ->assertExactJson(['message' => 'This action is not permitted.'])
            ->assertHeaderMissing('X-Inertia');

        $this->get('/api/missing', ['Accept' => 'text/html'])
            ->assertNotFound()
            ->assertJsonStructure(['message'])
            ->assertJsonMissingPath('component')
            ->assertHeaderMissing('X-Inertia');
    }

    public function test_explicit_json_exception_responses_are_not_replaced(): void
    {
        Route::get('/__error-test', fn () => abort(response()->json(['reason' => 'wait'], 429)));

        $this->get('/__error-test', ['X-Inertia' => 'true', 'Accept' => 'text/html'])
            ->assertStatus(429)
            ->assertExactJson(['reason' => 'wait'])
            ->assertHeaderMissing('X-Inertia');
    }

    public function test_retry_headers_survive_inertia_error_rendering(): void
    {
        Route::get('/__error-test', fn () => abort(429, '', [
            'Retry-After' => '45',
            'X-RateLimit-Limit' => '20',
            'X-RateLimit-Remaining' => '0',
        ]));

        $this->get('/__error-test', ['X-Inertia' => 'true', 'Accept' => 'text/html'])
            ->assertStatus(429)
            ->assertHeader('Retry-After', '45')
            ->assertHeader('X-RateLimit-Limit', '20')
            ->assertHeader('X-RateLimit-Remaining', '0');
    }

    public function test_error_rendering_preserves_cookies_and_existing_vary_headers(): void
    {
        $response = new Response('Previous content', 503, ['Retry-After' => '60', 'Vary' => 'Accept-Encoding']);
        $cookie = Cookie::create('test-cookie', 'test-value');
        $response->headers->setCookie($cookie);

        $rendered = ErrorPages::respond($response, new HttpException(503), Request::create('/unavailable'));

        $this->assertSame($response, $rendered);
        $this->assertSame(503, $rendered->getStatusCode());
        $this->assertSame('60', $rendered->headers->get('Retry-After'));
        $this->assertContains($cookie, $rendered->headers->getCookies());
        $this->assertContains('Accept-Encoding', $rendered->getVary());
        $this->assertContains('X-Inertia', $rendered->getVary());
    }

    public function test_error_rendering_does_not_need_database_or_authentication(): void
    {
        DB::shouldReceive('connection')->never();

        $request = Request::create('/unavailable');
        $request->setUserResolver(fn () => throw new RuntimeException('Authentication is unavailable'));

        $response = $this->app->make(ExceptionHandler::class)->render($request, new RuntimeException('Database unavailable'));

        $this->assertSame(500, $response->getStatusCode());
        $this->assertStringContainsString('Something went wrong', $response->getContent());
        $this->assertStringNotContainsString('Database unavailable', $response->getContent());

        $request->headers->set('X-Inertia', 'true');
        $request->headers->set('Accept', 'text/html');
        $response = $this->app->make(ExceptionHandler::class)->render($request, new RuntimeException('Database unavailable'));

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('true', $response->headers->get('X-Inertia'));
        $this->assertStringContainsString('Something went wrong', $response->getContent());
    }

    public function test_debug_responses_are_left_to_the_framework(): void
    {
        config(['app.debug' => true]);
        $response = new Response('Developer exception trace', 500);
        $request = Request::create('/broken');
        $request->headers->set('X-Inertia', 'true');

        $rendered = ErrorPages::respond($response, new RuntimeException('Test error'), $request);

        $this->assertSame($response, $rendered);
        $this->assertSame('Developer exception trace', $rendered->getContent());
        $this->assertFalse($rendered->headers->has('X-Inertia'));
    }
}
