<?php

namespace App\Console\Commands;

use App\Services\ImageUploads;
use Illuminate\Console\Command;

class CheckMedia extends Command
{
    protected $signature = 'media:check';

    protected $description = 'Check image configuration locally without contacting storage or displaying credentials';

    public function handle(): int
    {
        $this->line(config('media.enabled') ? 'Upload switch: enabled.' : 'Upload switch: disabled.');

        if (! extension_loaded('gd') || ! extension_loaded('exif') || ! function_exists('imagewebp')) {
            $this->error('GD with WebP support and EXIF are required. Rebuild with the project Dockerfile.');

            return self::FAILURE;
        }

        if (! ImageUploads::configured()) {
            $this->error('Image storage configuration is incomplete or invalid. Follow docs/MEDIA.md.');

            return self::FAILURE;
        }

        $this->info('Local configuration is ready.');
        $this->line('Provider access, public delivery, caching and billing alerts have not been checked.');

        return self::SUCCESS;
    }
}
