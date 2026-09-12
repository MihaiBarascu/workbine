<?php

// Only the disposable browser-test server uses simulated moderation decisions.
use App\Models\User;
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
        'moderation.enabled' => true,
        'moderation.api_key' => 'browser-test-only',
        'moderation.admin_user_ids' => [(string) User::query()->where('email', 'preview-moderator@example.test')->value('id')],
    ]);
    Http::preventStrayRequests();
    Http::fake(['api.openai.com/v1/moderations' => function (ClientRequest $request) {
        if (str_contains($request->body(), 'MODERATION_OUTAGE')) {
            return Http::response([], 503);
        }
        $categories = array_fill_keys(config('moderation.review_categories'), false);
        $categories['sexual'] = str_contains($request->body(), 'MODERATION_HOLD') || $request['input'][0]['type'] === 'image_url';

        return Http::response(['results' => [['categories' => $categories]]]);
    }]);
});
$app->handleRequest(Request::capture());
