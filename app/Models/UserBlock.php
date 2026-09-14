<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $blocker_id
 * @property int $blocked_id
 */
#[Fillable(['blocker_id', 'blocked_id'])]
class UserBlock extends Model
{
    /** @return BelongsTo<User, $this> */
    public function blocker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocker_id');
    }

    /** @return BelongsTo<User, $this> */
    public function blocked(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_id');
    }

    public static function existsBetween(User $first, User $second): bool
    {
        return self::query()->where(fn ($query) => $query
            ->where('blocker_id', $first->id)->where('blocked_id', $second->id))
            ->orWhere(fn ($query) => $query
                ->where('blocker_id', $second->id)->where('blocked_id', $first->id))
            ->exists();
    }
}
