<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\Message;
use App\Models\Method;
use App\Models\Topic;

class ReportTargets
{
    public static function find(string $type, int $id, bool $includeHidden = false): Topic|Method|Experience|Message|null
    {
        $query = match ($type) {
            'topic' => Topic::query(),
            'method' => Method::query(),
            'experience' => Experience::query(),
            'message' => Message::query(),
            default => null,
        };

        if ($includeHidden) {
            $query?->withoutGlobalScopes();
        } elseif ($type === 'message') {
            $query?->whereNull('hidden_at');
        }

        return $query?->find($id);
    }

    public static function url(Topic|Method|Experience|Message $target): string
    {
        return match (true) {
            $target instanceof Topic => route('topics.show', $target, false),
            $target instanceof Method => route('methods.show', [$target->topic, $target], false),
            $target instanceof Message => route('messages.show', $target->conversation, false).'#message-'.$target->id,
            default => self::experienceUrl($target),
        };
    }

    private static function experienceUrl(Experience $experience): string
    {
        $preceding = $experience->method->experiences()->where('outcome', $experience->outcome)->where(fn ($query) => $query
            ->where('updated_at', '>', $experience->updated_at)
            ->orWhere(fn ($query) => $query->where('updated_at', $experience->updated_at)->where('id', '>', $experience->id)))
            ->count();
        $page = intdiv($preceding, 10) + 1;

        return route('methods.show', [$experience->method->topic, $experience->method, 'outcome' => $experience->outcome, ...($page > 1 ? ['page' => $page] : [])], false).'#experience-'.$experience->id;
    }
}
