<?php

use App\Models\ModerationReview;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Optional maintenance command; ordinary moderation visits also remove expired records.
Artisan::command('moderation:prune', function () {
    $count = ModerationReview::query()
        ->where('created_at', '<=', now()->subDays(config('moderation.review_days')))->delete();
    $this->info('Expired moderation records removed: '.$count);
})->purpose('Remove expired private moderation snapshots');
