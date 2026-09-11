<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $target_type
 * @property int $target_id
 * @property string $reason
 * @property string|null $details
 * @property string $status
 * @property string|null $review_note
 */
#[Fillable(['user_id', 'target_type', 'target_id', 'reason', 'details'])]
class ContentReport extends Model {}
