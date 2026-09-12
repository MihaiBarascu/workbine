<?php

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || getenv('WORKBINE_BROWSER_PILOT') !== '1'
    || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== '/tmp/workbine-preview.sqlite'
    || config('app.url') !== 'http://127.0.0.1:8000') {
    throw new RuntimeException('Browser fixtures require the isolated local pilot.');
}
$token = $argv[2] ?? '';
if (! preg_match('/^[a-f0-9]{20}$/D', $token)) {
    throw new InvalidArgumentException('Expected a unique fixture token.');
}
DB::statement('PRAGMA busy_timeout = 10000');
DB::transaction(function () use ($argv, $token): void {
    $roles = ['owner', 'contributor', 'reviewer'];
    $emails = array_map(fn ($role) => "pilot-{$role}-{$token}@example.test", $roles);
    if (($argv[1] ?? '') === 'cleanup') {
        // Email-change scenarios must remain removable even after a failed assertion.
        User::query()->whereIn('username', ['o-'.$token, 'c-'.$token, 'r-'.$token])->get()->each->delete();

        return;
    }
    if (($argv[1] ?? '') !== 'create') {
        throw new InvalidArgumentException('Unknown fixture action.');
    }
    $password = 'local-pilot-password!';
    $actors = [];
    foreach ($roles as $i => $role) {
        $user = User::factory()->create([
            'name' => ucfirst($role).' '.$token,
            'username' => substr($role, 0, 1).'-'.$token,
            'email' => $emails[$i],
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);
        $actors[$role] = [...$user->only(['id', 'name', 'email', 'username']), 'password' => $password];
    }
    $topic = Topic::factory()->create([
        'user_id' => $actors['owner']['id'], 'title' => 'Client workflow '.$token,
        'slug' => 'client-workflow-'.$token, 'category' => 'ai',
        'description' => 'A synthetic, isolated browser-test topic.',
    ]);
    $topic->tags()->create(['name' => 'p-'.$token]);
    $method = Method::factory()->create([
        'user_id' => $actors['owner']['id'], 'topic_id' => $topic->id,
        'title' => 'A focused paid pilot '.$token, 'body' => 'Agree the scope, show a sample and measure the result.',
    ]);
    echo json_encode([...$actors, 'token' => $token, 'topic' => $topic->only(['id', 'title', 'slug']), 'method' => $method->only(['id', 'title'])], JSON_THROW_ON_ERROR);
});
