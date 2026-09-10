<?php

namespace App\Models;

use Database\Factories\MethodFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $topic_id
 * @property int $user_id
 * @property string $title
 * @property string $body
 * @property string|null $source_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Topic $topic
 * @property-read User $user
 */
#[Fillable(['topic_id', 'user_id', 'title', 'body', 'source_url'])]
class Method extends Model
{
    /** @use HasFactory<MethodFactory> */
    use HasFactory;

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
}
