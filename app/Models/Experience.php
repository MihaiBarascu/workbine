<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $method_id
 * @property int $user_id
 * @property string $outcome
 * @property string $body
 * @property string|null $evidence_url
 * @property int|null $evidence_image_id
 * @property-read MediaImage|null $evidenceImage
 * @property Carbon|null $tried_on
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Method $method
 * @property-read User $user
 */
#[Fillable(['method_id', 'user_id', 'outcome', 'body', 'evidence_url', 'tried_on'])]
class Experience extends Model
{
    /** @return BelongsTo<Method, $this> */
    public function method(): BelongsTo
    {
        return $this->belongsTo(Method::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<MediaImage, $this> */
    public function evidenceImage(): BelongsTo
    {
        return $this->belongsTo(MediaImage::class, 'evidence_image_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['tried_on' => 'date'];
    }
}
