<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $fingerprint
 * @property string $context
 * @property array<string, mixed>|null $payload
 * @property list<string> $categories
 * @property string $status
 * @property string|null $review_note
 * @property Carbon $created_at
 */
#[Fillable(['user_id', 'fingerprint', 'context', 'payload', 'categories'])]
#[Hidden(['payload', 'fingerprint', 'review_note'])]
class ModerationReview extends Model
{
    protected function casts(): array
    {
        return [
            'payload' => 'encrypted:array',
            'categories' => 'array',
            'review_note' => 'encrypted',
            'reviewed_at' => 'datetime',
        ];
    }
}
