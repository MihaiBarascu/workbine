<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property int $user_id
 * @property string $body
 * @property string|null $context_type
 * @property int|null $context_id
 * @property Carbon|null $read_at
 * @property Carbon|null $hidden_at
 * @property Carbon|null $created_at
 * @property-read Conversation $conversation
 * @property-read User $user
 */
#[Fillable(['conversation_id', 'user_id', 'body', 'context_type', 'context_id', 'read_at'])]
class Message extends Model
{
    /** @return BelongsTo<Conversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param Builder<self> $query */
    public function scopeUnreadFor(Builder $query, User $user): void
    {
        $query->where('user_id', '<>', $user->id)
            ->whereNull('read_at')
            ->whereNull('hidden_at')
            ->whereHas('conversation', fn (Builder $query) => $query
                ->where(fn (Builder $query) => $query
                    ->where('user_one_id', $user->id)
                    ->orWhere('user_two_id', $user->id)));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'hidden_at' => 'datetime',
        ];
    }
}
