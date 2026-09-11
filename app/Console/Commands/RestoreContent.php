<?php

namespace App\Console\Commands;

use App\Support\ReportTargets;
use Illuminate\Console\Command;

class RestoreContent extends Command
{
    protected $signature = 'content:restore {type : topic, method or experience} {id : Content ID}';

    protected $description = 'Restore the visibility of a previously hidden contribution';

    public function handle(): int
    {
        $id = (string) $this->argument('id');
        if (preg_match('/^[1-9][0-9]{0,17}$/D', $id) !== 1) {
            $this->error('Use a positive content ID of at most 18 digits.');

            return self::FAILURE;
        }

        $target = ReportTargets::find((string) $this->argument('type'), (int) $id, true);
        if ($target === null) {
            $this->error('Content not found.');

            return self::FAILURE;
        }
        $target->newQueryWithoutScopes()->whereKey($target->getKey())->toBase()->update(['hidden_at' => null]);
        $this->info('Content restored. A hidden parent topic or method still limits public visibility.');

        return self::SUCCESS;
    }
}
