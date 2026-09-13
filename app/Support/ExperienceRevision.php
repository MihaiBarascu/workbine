<?php

namespace App\Support;

use App\Models\Experience;
use Illuminate\Validation\ValidationException;

class ExperienceRevision
{
    public static function token(?Experience $experience): string
    {
        if ($experience === null || ! $experience->exists) {
            return 'new';
        }

        // Identity distinguishes a removed/recreated response; content catches
        // edits made in the same timestamp second, including formatting/photos.
        return hash('sha256', json_encode([
            ...$experience->only(['id', 'method_id', 'user_id', 'outcome', 'body', 'body_document', 'evidence_url', 'evidence_image_id']),
            'tried_on' => $experience->tried_on?->toDateString(),
            'updated_at' => $experience->getRawOriginal('updated_at'),
        ], JSON_THROW_ON_ERROR));
    }

    public static function assertMatches(?Experience $experience, string $revision): void
    {
        if (! hash_equals(self::token($experience), $revision)) {
            throw ValidationException::withMessages([
                'experience_revision' => __('Your response changed or was removed while you were editing. Copy your draft and reload the latest response before trying again.'),
            ]);
        }
    }
}
