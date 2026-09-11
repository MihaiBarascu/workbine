<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;

class ReportTargets
{
    public static function find(string $type, int $id, bool $includeHidden = false): Topic|Method|Experience|null
    {
        $query = match ($type) {
            'topic' => Topic::query(),
            'method' => Method::query(),
            'experience' => Experience::query(),
            default => null,
        };

        if ($includeHidden) {
            $query?->withoutGlobalScopes();
        }

        return $query?->find($id);
    }

    public static function url(Topic|Method|Experience $target): string
    {
        return match (true) {
            $target instanceof Topic => route('topics.show', $target, false),
            $target instanceof Method => route('topics.show', $target->topic, false).'#method-'.$target->id,
            default => route('experiences.index', [$target->method->topic, $target->method], false).'#experience-'.$target->id,
        };
    }
}
