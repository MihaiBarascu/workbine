<?php

namespace App\Models;

use Database\Factories\MethodFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string|null $hidden_at
 * @property int $id
 * @property int $topic_id
 * @property int $user_id
 * @property string $title
 * @property array<string, mixed>|null $body_document
 * @property string $body
 * @property string|null $source_url
 * @property int|null $experiences_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Topic $topic
 * @property-read User $user
 */
#[Fillable(['topic_id', 'user_id', 'title', 'body', 'body_document', 'source_url'])]
class Method extends Model
{
    /** @use HasFactory<MethodFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['body_document' => 'array'];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('visible', function (Builder $query): void {
            $query->whereNull($query->getModel()->qualifyColumn('hidden_at'));
            $query->whereHas('topic');
        });
    }

    /** @return BelongsTo<Topic, $this> */
    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Experience, $this> */
    public function experiences(): HasMany
    {
        return $this->hasMany(Experience::class);
    }
}
