<?php

namespace App\Console\Commands;

use App\Services\ImageUploads;
use Illuminate\Console\Command;

class PruneImages extends Command
{
    protected $signature = 'media:prune';

    protected $description = 'Retry failed image deletions and remove unreferenced uploads older than one hour';

    public function handle(ImageUploads $uploads): int
    {
        $result = $uploads->prune();
        $this->info("Deleted: {$result['deleted']}; awaiting retry: {$result['failed']}.");

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
