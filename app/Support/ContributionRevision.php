<?php

namespace App\Support;

use App\Models\Method;
use App\Models\Topic;

class ContributionRevision
{
    public static function token(Topic|Method $contribution): string
    {
        $fields = $contribution instanceof Topic
            ? ['title', 'description']
            : ['title', 'body', 'body_document', 'source_url'];

        // Content also distinguishes edits saved within the same timestamp second.
        return hash('sha256', json_encode($contribution->only($fields), JSON_THROW_ON_ERROR));
    }
}
