<?php

// Test-only PHP development server. Never used by the production entry point.
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

if (PHP_SAPI !== 'cli-server' || getenv('APP_ENV') !== 'testing') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__, 2);
$path = realpath($root.'/public'.parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if ($path && str_starts_with($path, $root.'/public/') && is_file($path) && ! str_ends_with($path, '.php')) {
    return false;
}

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->booted(function () {
    config([
        'services.turnstile.enabled' => true,
        'services.turnstile.site_key' => '1x00000000000000000000AA',
        'services.turnstile.secret_key' => 'test-only-secret',
    ]);
    Http::preventStrayRequests();
    Http::fake(['challenges.cloudflare.com/*' => fn (ClientRequest $request) => Http::response([
        'success' => in_array($request['response'], ['browser-test-token', 'XXXX.DUMMY.TOKEN.XXXX'], true),
        'hostname' => parse_url(config('app.url'), PHP_URL_HOST),
        'action' => 'register',
    ])]);
});
$app->handleRequest(Request::capture());
