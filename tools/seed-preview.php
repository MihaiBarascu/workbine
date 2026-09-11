<?php

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Hash;

// Synthetic fixtures for disposable test databases only.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== '/tmp/workbine-preview.sqlite') {
    throw new RuntimeException('Preview fixtures require the disposable SQLite test database.');
}

$author = User::factory()->create(['name' => 'A community contributor with a deliberately long name']);
User::factory()->create(['email' => 'preview-two-factor@example.test', 'password' => Hash::make('preview-only-password'), 'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'), 'two_factor_recovery_codes' => encrypt(json_encode(['preview-recovery-code'])), 'two_factor_confirmed_at' => now()]);
User::factory()->create(['name' => 'Preview Contributor', 'email' => 'preview-contributor@example.test', 'password' => Hash::make('preview-only-password')]);
User::factory()->create(['name' => 'Reputation Preview Supporter', 'email' => 'preview-reputation-supporter@example.test', 'password' => Hash::make('preview-only-password'), 'email_verified_at' => now()]);
$topic = Topic::factory()->create(['user_id' => $author->id, 'slug' => 'preview-first-customer', 'title' => 'How do you find the first customer for a small SaaS?', 'description' => 'I have a working prototype and limited time outside my day job. What helped you find a real problem someone would pay to solve?']);
Method::factory()->create(['topic_id' => $topic->id, 'user_id' => $author->id, 'title' => 'Watch one person do the work before writing more code', 'body' => "I asked a shop owner to walk me through a weekly product import.\n\nFirst, we noted which steps repeated. Then I automated only the slowest part and tested it on a copy of the data.\n\nIt saved time in that situation, but I still needed to handle unusual supplier files manually. Start with one workflow, not an entire platform.", 'source_url' => 'https://example.com/a-source-with-a-deliberately-long-path-to-check-small-screen-wrapping']);
Topic::factory()->create(['user_id' => $author->id, 'slug' => 'preview-unanswered', 'title' => 'How do you keep a side project moving with only a few hours a week?', 'description' => 'I am looking for a routine that people have actually kept up, not an ideal schedule.']);
