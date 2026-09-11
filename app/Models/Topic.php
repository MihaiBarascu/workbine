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
 * @property string|null $hidden_at
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
#[Fillable(['user_id', 'title', 'slug', 'description'])]
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

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
