<?php

namespace App\Support;

use App\Models\Method;
use App\Models\Topic;

class ContributionRevision
{
    public static function token(Topic|Method $contribution): string
    {
        $fields = $contribution instanceof Topic
            ? ['title', 'description', 'category']
            : ['title', 'body', 'body_document', 'source_url'];

        // Content also distinguishes edits saved within the same timestamp second.
        $values = $contribution->only($fields);
        if ($contribution instanceof Topic) {
            $values['tags'] = $contribution->tags()->orderBy('name')->pluck('name')->all();
        }

        return hash('sha256', json_encode($values, JSON_THROW_ON_ERROR));
    }
}
