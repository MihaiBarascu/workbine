<?php

namespace App\Services;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Support\RichText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Exceptions\ImageException;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;
use Throwable;

class ImageUploads
{
    /**
     * Shared daily budget for the whole site. Only accepted uploads consume it, so
     * rejected files cannot block other members (checked by ThrottleImageUploads).
     */
    public const GLOBAL_DAILY_KEY = 'media:global:day';

    public static function enabled(): bool
    {
        return (bool) config('media.enabled') && self::configured();
    }

    public static function configured(): bool
    {
        if (config('media.disk') !== 'r2') {
            return app()->environment(['local', 'testing']) && config('media.disk') === 'public';
        }

        foreach (['key', 'secret', 'bucket', 'endpoint', 'url'] as $key) {
            if (! is_string(config('filesystems.disks.r2.'.$key)) || trim(config('filesystems.disks.r2.'.$key)) === '') {
                return false;
            }
        }

        $endpoint = parse_url(config('filesystems.disks.r2.endpoint'));
        $public = parse_url(config('filesystems.disks.r2.url'));

        return is_array($endpoint) && ($endpoint['scheme'] ?? '') === 'https'
            && str_ends_with($endpoint['host'] ?? '', '.r2.cloudflarestorage.com')
            && ! isset($endpoint['user']) && ! isset($endpoint['pass']) && ! isset($endpoint['port'])
            && ! isset($endpoint['query']) && ! isset($endpoint['fragment'])
            && in_array($endpoint['path'] ?? '', ['', '/'], true)
            && is_array($public) && ($public['scheme'] ?? '') === 'https'
            && ! empty($public['host']) && ! isset($public['user']) && ! isset($public['pass'])
            && ! isset($public['query']) && ! isset($public['fragment']) && ! isset($public['port'])
            && in_array($public['path'] ?? '', ['', '/'], true)
            && ! str_ends_with($public['host'], '.r2.dev')
            && ! str_ends_with($public['host'], '.r2.cloudflarestorage.com');
    }

    /** @return list<string> */
    public static function rules(): array
    {
        return ['file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.config('media.max_upload_kb')];
    }

    public function store(User $user, UploadedFile $file, string $field): MediaImage
    {
        if (! self::enabled()) {
            throw ValidationException::withMessages([$field => __('Image uploads are not available yet.')]);
        }

        $lock = Cache::lock('media:image-processing', 120);

        if (! $lock->get()) {
            throw ValidationException::withMessages([$field => __('Another image is being processed. Please try again in a moment.')]);
        }

        try {
            [$contents, $width, $height] = $this->encode($file, $field);
        } finally {
            $lock->release();
        }
        app(ContentModeration::class)->image($user, $contents, $field);

        $image = DB::transaction(function () use ($user, $contents, $width, $height, $field): MediaImage {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Reservations and objects waiting for deletion also consume the quota.
            $used = (int) MediaImage::query()->where('user_id', $user->id)->sum('bytes');

            if ($used + strlen($contents) > (int) config('media.user_quota_bytes')) {
                throw ValidationException::withMessages([$field => __('Your image storage is full. Remove an existing image before uploading another.')]);
            }

            return MediaImage::query()->create([
                'user_id' => $user->id,
                'disk' => config('media.disk'),
                'path' => 'images/'.Str::uuid().'.webp',
                'bytes' => strlen($contents),
                'width' => $width,
                'height' => $height,
            ]);
        });

        try {
            $written = Storage::disk($image->disk)->put($image->path, $contents, [
                'ContentType' => 'image/webp',
                'CacheControl' => 'public, max-age=3600',
            ]);

            if (! $written) {
                throw new \RuntimeException('Image storage did not acknowledge the write.');
            }
        } catch (Throwable $exception) {
            $this->discard($image);
            // Do not put provider URLs, request headers or credentials in logs/errors.
            Log::warning('Image upload failed.', ['image_id' => $image->id, 'exception' => $exception::class]);
            throw ValidationException::withMessages([$field => __('The image could not be saved. Please try again.')]);
        }

        RateLimiter::hit(self::GLOBAL_DAILY_KEY, 86400);

        return $image;
    }

    /** @return array{string, int, int} */
    private function encode(UploadedFile $file, string $field): array
    {
        $size = @getimagesize($file->getPathname());

        if ($size === false || ! in_array($size[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            throw ValidationException::withMessages([$field => __('Choose a valid JPEG, PNG or WebP image.')]);
        }

        if ($size[0] < 1 || $size[1] < 1 || (int) config('media.max_pixels') < $size[0] * $size[1]) {
            throw ValidationException::withMessages([$field => __('Choose an image with no more than 16 million pixels.')]);
        }

        try {
            $manager = ImageManager::usingDriver(Driver::class, autoOrientation: true, decodeAnimation: false, strip: true);
            $image = $manager->decodePath($file->getPathname());
            $dimension = (int) config($field === 'avatar' ? 'media.avatar_dimension' : 'media.evidence_dimension');

            if ($field === 'avatar') {
                $image->coverDown($dimension, $dimension);
            } else {
                $image->scaleDown($dimension, $dimension);
            }

            $contents = (string) $image->encodeUsingFormat(Format::WEBP, quality: 78, strip: true);
        } catch (ImageException) {
            throw ValidationException::withMessages([$field => __('This image could not be read. Please choose another image.')]);
        }

        if (strlen($contents) > (int) config('media.max_image_bytes')) {
            throw ValidationException::withMessages([$field => __('This image is still too large after compression. Please choose a smaller image.')]);
        }

        return [$contents, $image->width(), $image->height()];
    }

    public function discard(?MediaImage $image): bool
    {
        if ($image === null) {
            return true;
        }

        return DB::transaction(function () use ($image): bool {
            $image = MediaImage::query()->whereKey($image->id)->lockForUpdate()->first();
            if ($image === null) {
                return true;
            }
            // References are removed in a committed transaction before this is called.
            if (! MediaImage::query()->whereKey($image->id)->unreferenced()->exists()) {
                return false;
            }

            $image->update(['pending_deletion' => true]);

            try {
                if (! Storage::disk($image->disk)->delete($image->path)) {
                    throw new \RuntimeException('Image storage did not acknowledge the deletion.');
                }

                $image->delete();

                return true;
            } catch (Throwable $exception) {
                Log::warning('Image deletion needs retry.', ['image_id' => $image->id, 'exception' => $exception::class]);

                return false;
            }
        });
    }

    public function deleteAccount(User $user): void
    {
        $images = DB::transaction(function () use ($user) {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $images = MediaImage::query()
                ->where(fn ($query) => $query->where('user_id', $user->id)->where('rich_text', true))
                ->orWhereIn('rich_method_id', Method::withoutGlobalScopes()->select('id')->where('user_id', $user->id)
                    ->orWhereHas('topic', fn ($query) => $query->withoutGlobalScopes()->where('user_id', $user->id)))
                ->orWhereIn('rich_experience_id', Experience::withoutGlobalScopes()->select('id')->where('user_id', $user->id)
                    ->orWhereHas('method', fn ($query) => $query->withoutGlobalScopes()->where('user_id', $user->id)
                        ->orWhereHas('topic', fn ($query) => $query->withoutGlobalScopes()->where('user_id', $user->id))))
                ->orWhereHas('avatars', fn ($query) => $query->whereKey($user->id))
                ->orWhereHas('experiences', fn ($query) => $query->where('user_id', $user->id)
                    ->orWhereHas('method', fn ($query) => $query->withoutGlobalScopes()->where('user_id', $user->id)
                        ->orWhereHas('topic', fn ($query) => $query->withoutGlobalScopes()->where('user_id', $user->id))))
                ->get();
            $locked->delete();
            MediaImage::query()->whereKey($images->modelKeys())->unreferenced()->update(['pending_deletion' => true]);

            return $images;
        });

        foreach ($images as $image) {
            $this->discard($image);
        }
    }

    public function contributionImageCount(Topic|Method|Experience $target): int
    {
        return $this->contributionImages($target)->count();
    }

    /**
     * Moderation removal: hiding keeps photos reachable by direct link, so a moderator can
     * delete those of the hidden contribution and of everything shown under it.
     *
     * @return array{deleted: int, failed: int}
     */
    public function deleteContributionImages(Topic|Method|Experience $target): array
    {
        $images = DB::transaction(function () use ($target) {
            $images = $this->contributionImages($target)->lockForUpdate()->get();
            $ids = $images->modelKeys();

            // Query-builder updates keep contribution timestamps unchanged.
            Experience::withoutGlobalScopes()->whereIn('evidence_image_id', $ids)->toBase()->update(['evidence_image_id' => null]);
            foreach ([
                Method::class => $images->pluck('rich_method_id'),
                Experience::class => $images->pluck('rich_experience_id'),
            ] as $model => $contributionIds) {
                foreach ($model::withoutGlobalScopes()->whereKey($contributionIds->filter()->unique()->values())->get() as $contribution) {
                    if (! is_array($contribution->body_document)) {
                        continue;
                    }
                    $document = RichText::withoutImages($contribution->body_document);
                    $model::withoutGlobalScopes()->whereKey($contribution->id)->toBase()->update([
                        'body_document' => json_encode($document, JSON_THROW_ON_ERROR),
                        'body' => trim(RichText::text($document)),
                    ]);
                }
            }
            MediaImage::query()->whereKey($ids)->update(['rich_method_id' => null, 'rich_experience_id' => null, 'pending_deletion' => true]);

            return $images;
        });

        $result = ['deleted' => 0, 'failed' => 0];
        foreach ($images as $image) {
            // Failures stay marked for the scheduled media:prune retry.
            $result[$this->discard($image) ? 'deleted' : 'failed']++;
        }

        return $result;
    }

    /** @return Builder<MediaImage> */
    private function contributionImages(Topic|Method|Experience $target): Builder
    {
        $methods = match (true) {
            $target instanceof Topic => Method::withoutGlobalScopes()->where('topic_id', $target->id)->select('id'),
            $target instanceof Method => Method::withoutGlobalScopes()->whereKey($target->id)->select('id'),
            default => null,
        };
        $experiences = $methods === null
            ? Experience::withoutGlobalScopes()->whereKey($target->id)
            : Experience::withoutGlobalScopes()->whereIn('method_id', $methods);

        return MediaImage::query()->where(fn (Builder $query) => $query
            ->whereIn('rich_experience_id', (clone $experiences)->select('id'))
            ->orWhereIn('id', (clone $experiences)->whereNotNull('evidence_image_id')->select('evidence_image_id'))
            ->when($methods !== null, fn (Builder $query) => $query->orWhereIn('rich_method_id', $methods)));
    }

    /** @return array{deleted: int, failed: int} */
    public function prune(): array
    {
        $result = ['deleted' => 0, 'failed' => 0];

        MediaImage::query()->unreferenced()
            ->where(fn ($query) => $query->where('pending_deletion', true)->orWhere('created_at', '<', now()->subHour()))
            ->chunkById(100, function ($images) use (&$result): void {
                foreach ($images as $image) {
                    $result[$this->discard($image) ? 'deleted' : 'failed']++;
                }
            });

        return $result;
    }
}
