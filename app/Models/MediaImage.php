<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property bool $rich_text
 * @property int|null $rich_method_id
 * @property int|null $rich_experience_id
 * @property int $id
 * @property int|null $user_id
 * @property string $disk
 * @property string $path
 * @property int $bytes
 * @property int $width
 * @property int $height
 * @property bool $pending_deletion
 * @property Carbon $created_at
 */
#[Fillable(['user_id', 'disk', 'path', 'bytes', 'width', 'height', 'pending_deletion', 'rich_text', 'rich_method_id', 'rich_experience_id'])]
class MediaImage extends Model
{
    /** @return HasMany<User, $this> */
    public function avatars(): HasMany
    {
        return $this->hasMany(User::class, 'avatar_image_id');
    }

    /** @return HasMany<Experience, $this> */
    public function experiences(): HasMany
    {
        // Hidden contributions still own their evidence; moderation must not prune it.
        return $this->hasMany(Experience::class, 'evidence_image_id')->withoutGlobalScopes();
    }

    /** @param Builder<self> $query */
    public function scopeUnreferenced(Builder $query): void
    {
        $query->doesntHave('avatars')->doesntHave('experiences')->whereNull('rich_method_id')->whereNull('rich_experience_id');
    }

    public function url(): string
    {
        // URL generation is local: public rendering never checks the object store.
        return Storage::disk($this->disk)->url($this->path);
    }

    /** @return array{url: string, width: int, height: int} */
    public function publicData(): array
    {
        return ['url' => $this->url(), 'width' => $this->width, 'height' => $this->height];
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['rich_text' => 'boolean', 'rich_method_id' => 'integer', 'rich_experience_id' => 'integer', 'pending_deletion' => 'boolean', 'bytes' => 'integer', 'width' => 'integer', 'height' => 'integer'];
    }
}
