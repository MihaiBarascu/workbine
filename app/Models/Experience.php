<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string|null $hidden_at
 * @property int $id
 * @property int $method_id
 * @property int $user_id
 * @property string $outcome
 * @property array<string, mixed>|null $body_document
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
#[Fillable(['method_id', 'user_id', 'outcome', 'body', 'body_document', 'evidence_url', 'tried_on'])]
class Experience extends Model
{
    protected static function booted(): void
    {
        static::created(function (Experience $experience): void {
            // The HTTP publication transaction already holds this method's lock.
            // Use the base query so protection does not change the content's edit date.
            Method::withoutGlobalScopes()->whereKey($experience->method_id)
                ->where('user_id', '!=', $experience->user_id)->whereNull('protected_at')
                ->toBase()->update(['protected_at' => now()]);
        });

        static::addGlobalScope('visible', function (Builder $query): void {
            $query->whereNull($query->getModel()->qualifyColumn('hidden_at'));
            $query->whereHas('method');
        });
    }

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
        return ['tried_on' => 'date', 'body_document' => 'array'];
    }
}
