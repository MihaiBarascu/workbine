<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $method_id
 * @property string $body
 * @property Carbon|null $created_at
 */
#[Fillable(['method_id', 'submission_id', 'body'])]
class MethodUpdate extends Model
{
    /** @return BelongsTo<Method, $this> */
    public function method(): BelongsTo
    {
        return $this->belongsTo(Method::class);
    }
}
