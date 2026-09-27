<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use Illuminate\Validation\ValidationException;

/**
 * Photo galleries of methods and experiences: up to six uploaded photos in reading
 * order, each with an optional caption that is also its text alternative.
 */
class Photos
{
    public const LIMIT = 6;

    public const CAPTION_LIMIT = 140;

    /**
     * A form sends "{field}_present" with its gallery, so an older form that has no
     * gallery can never empty one by leaving the field out.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(string $field): array
    {
        return [
            "{$field}_present" => ['sometimes', 'accepted'],
            $field => ['sometimes', 'array', 'list', 'max:'.self::LIMIT],
            "{$field}.*" => ['array:id,caption'],
            "{$field}.*.id" => ['required', 'integer', 'distinct'],
            "{$field}.*.caption" => ['nullable', 'string', 'max:'.self::CAPTION_LIMIT],
        ];
    }

    /**
     * Replace a contribution's gallery inside its write transaction. Only the author's own
     * unattached uploads, or photos already in this gallery, can be listed.
     *
     * @param  list<array{id: int|string, caption?: string|null}>  $photos
     */
    public static function sync(Method|Experience $model, array $photos, string $field): void
    {
        $column = $model instanceof Method ? 'gallery_method_id' : 'gallery_experience_id';
        $ids = array_map(fn (array $photo): int => (int) $photo['id'], $photos);
        // Current and requested rows are locked in one order, before anything changes.
        $images = MediaImage::query()->whereIn('id', $ids)->orWhere($column, $model->id)
            ->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($ids as $id) {
            $image = $images->get($id);
            $inThisGallery = $image?->{$column} === $model->id;
            $unattached = $image !== null && $image->rich_text && ! $image->pending_deletion
                && $image->gallery_method_id === null && $image->gallery_experience_id === null
                && $image->rich_method_id === null && $image->rich_experience_id === null;
            if ($image === null || $image->user_id !== $model->user_id || (! $inThisGallery && ! $unattached)) {
                throw ValidationException::withMessages([$field => __('A photo is no longer available. Remove it and upload it again.')]);
            }
        }

        foreach ($photos as $position => $photo) {
            $images->get((int) $photo['id'])?->update([$column => $model->id, 'position' => $position, 'caption' => $photo['caption'] ?? null]);
        }
        // Photos taken out wait for the nightly media:prune, as edited-out photos always have.
        MediaImage::query()->where($column, $model->id)->whereNotIn('id', $ids)
            ->update([$column => null, 'position' => null, 'caption' => null, 'pending_deletion' => true]);
    }

    /**
     * Ordered ids and captions, so reordering or recaptioning changes a revision token.
     *
     * @return array<int, array{0: int, 1: string|null}>
     */
    public static function fingerprint(Method|Experience $model): array
    {
        return $model->photos()->get(['id', 'caption'])
            ->map(fn (MediaImage $photo): array => [$photo->id, $photo->caption])->values()->all();
    }

    /**
     * Captions for the text moderation request; checked like the rest of the text.
     *
     * @param  array<int, array{caption?: string|null}>  $photos
     */
    public static function captions(array $photos): string
    {
        return implode("\n", array_filter(array_map(fn (array $photo): string => trim((string) ($photo['caption'] ?? '')), $photos)));
    }

    /**
     * @param  iterable<MediaImage>  $photos
     * @return list<array{id?: int, url: string, width: int, height: int, caption: string|null}>
     */
    public static function serialize(iterable $photos, bool $withIds = false): array
    {
        $data = [];
        foreach ($photos as $photo) {
            $data[] = $withIds ? ['id' => $photo->id, ...$photo->galleryData()] : $photo->galleryData();
        }

        return $data;
    }
}
