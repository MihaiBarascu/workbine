<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $user_one_id
 * @property int $user_two_id
 * @property-read User $userOne
 * @property-read User $userTwo
 * @property-read Message|null $latestMessage
 */
#[Fillable(['user_one_id', 'user_two_id'])]
class Conversation extends Model
{
    /** @return BelongsTo<User, $this> */
    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    /** @return BelongsTo<User, $this> */
    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    /** @return HasMany<Message, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** @return HasOne<Message, $this> */
    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /** @param Builder<self> $query */
    public function scopeForUser(Builder $query, User $user): void
    {
        $query->where(fn (Builder $query) => $query
            ->where('user_one_id', $user->id)
            ->orWhere('user_two_id', $user->id));
    }

    public function involves(User $user): bool
    {
        return $this->user_one_id === $user->id || $this->user_two_id === $user->id;
    }

    public function other(User $user): User
    {
        abort_unless($this->involves($user), 404);

        return $this->user_one_id === $user->id ? $this->userTwo : $this->userOne;
    }

    /** @return array{0: int, 1: int} */
    public static function pair(User $first, User $second): array
    {
        return $first->id < $second->id
            ? [$first->id, $second->id]
            : [$second->id, $first->id];
    }
}
