<?php

namespace App\Models;

use Database\Factories\TopicFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * @property string|null $category
 * @property int|null $likes_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, TopicTag> $tags
 * @property string|null $hidden_at
 * @property-read MediaImage|null $coverImage
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property int|null $methods_count
 * @property int|null $saves_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Collection<int, Method> $methods
 */
#[Fillable(['user_id', 'title', 'slug', 'description', 'category'])]
class Topic extends Model
{
    /** @use HasFactory<TopicFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::addGlobalScope('visible', function (Builder $query): void {
            $query->whereNull($query->getModel()->qualifyColumn('hidden_at'));
        });
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Method, $this> */
    public function methods(): HasMany
    {
        return $this->hasMany(Method::class);
    }

    /** @return HasMany<SavedTopic, $this> */
    public function communitySaves(): HasMany
    {
        // Authors can bookmark their own topics, but cannot increase this public count.
        return $this->hasMany(SavedTopic::class)
            ->whereHas('topic', fn (Builder $query) => $query
                ->whereColumn('topics.user_id', '<>', 'saved_topics.user_id'));
    }

    /** @return BelongsTo<MediaImage, $this> */
    public function coverImage(): BelongsTo
    {
        return $this->belongsTo(MediaImage::class, 'cover_image_id');
    }

    /** @return HasMany<SavedTopic, $this> */
    public function saves(): HasMany
    {
        return $this->hasMany(SavedTopic::class);
    }

    /** @param Builder<self> $query */
    public function scopeWithCover(Builder $query): void
    {
        $query->addSelect('topics.*')->selectSub(
            MediaImage::query()->select('media_images.id')
                ->join('methods', 'methods.id', '=', 'media_images.rich_method_id')
                ->whereColumn('methods.topic_id', 'topics.id')->whereNull('methods.hidden_at')
                ->where('media_images.pending_deletion', false)->orderBy('media_images.id')->limit(1),
            'cover_image_id'
        )->with('coverImage');
    }

    /** @return HasMany<TopicTag, $this> */
    public function tags(): HasMany
    {
        return $this->hasMany(TopicTag::class)->orderBy('id');
    }

    /** @return HasMany<TopicLike, $this> */
    public function likes(): HasMany
    {
        return $this->hasMany(TopicLike::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
