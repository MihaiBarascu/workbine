<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $actor_id
 * @property int $method_id
 * @property int|null $experience_id
 * @property Carbon|null $read_at
 * @property Carbon $created_at
 * @property-read User $actor
 * @property-read Experience|null $experience
 * @property-read Method $method
 */
#[Fillable(['user_id', 'actor_id', 'method_id', 'experience_id', 'read_at'])]
class CommunityNotification extends Model
{
    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @return BelongsTo<Method, $this> */
    public function method(): BelongsTo
    {
        return $this->belongsTo(Method::class);
    }

    /** @return BelongsTo<Experience, $this> */
    public function experience(): BelongsTo
    {
        return $this->belongsTo(Experience::class);
    }

    /** @param Builder<self> $query */
    public function scopeVisible(Builder $query): void
    {
        // Never surface snapshots of removed or moderated content.
        $query->whereHas('method')->where(fn ($query) => $query->whereNull('experience_id')->orWhereHas('experience'));
    }

    public static function forMethod(Method $method): void
    {
        if ($method->user_id !== $method->topic->user_id) {
            self::query()->create(['user_id' => $method->topic->user_id, 'actor_id' => $method->user_id, 'method_id' => $method->id]);
        }
    }

    public static function forExperience(Experience $experience): void
    {
        if ($experience->wasRecentlyCreated && $experience->user_id !== $experience->method->user_id) {
            self::query()->create(['user_id' => $experience->method->user_id, 'actor_id' => $experience->user_id, 'method_id' => $experience->method_id, 'experience_id' => $experience->id]);
        }
    }

    public function destination(): string
    {
        $topic = $this->method->topic;
        if ($this->experience_id === null) {
            return route('methods.show', [$topic, $this->method_id]);
        }

        $experience = $this->experience;
        abort_if($experience === null, 404);
        // Match the public response ordering so older alerts open the right page.
        $preceding = $this->method->experiences()->where(fn ($query) => $query
            ->where('updated_at', '>', $experience->updated_at)
            ->orWhere(fn ($query) => $query->where('updated_at', $experience->updated_at)->where('id', '>', $experience->id)))
            ->count();

        return route('experiences.index', [$topic, $this->method, 'page' => intdiv($preceding, 10) + 1]).'#experience-'.$this->experience_id;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
