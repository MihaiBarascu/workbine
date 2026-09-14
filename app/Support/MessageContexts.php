<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\Message;
use App\Models\Method;
use App\Models\User;
use Illuminate\Support\Collection;

class MessageContexts
{
    public static function resolveForRecipient(?string $type, ?int $id, User $recipient): Method|Experience|null
    {
        if ($type === null && $id === null) {
            return null;
        }

        abort_unless(in_array($type, ['method', 'experience'], true) && $id !== null, 404);
        $target = ReportTargets::find($type, $id);
        abort_unless($target instanceof Method || $target instanceof Experience, 404);
        abort_unless($target->user_id === $recipient->id, 404);

        return $target;
    }

    /**
     * @param Collection<int, Message> $messages
     * @return array<int, array{id: int, type: string, title: string, url: string}>
     */
    public static function forMessages(Collection $messages): array
    {
        $methodIds = $messages->where('context_type', 'method')->pluck('context_id')->filter()->unique()->values();
        $experienceIds = $messages->where('context_type', 'experience')->pluck('context_id')->filter()->unique()->values();

        $contexts = [];
        Method::query()->whereIn('id', $methodIds)->with('topic:id,slug')->get()->each(
            function (Method $method) use (&$contexts): void {
                $contexts[$method->id] = [
                    'id' => $method->id,
                    'type' => 'method',
                    'title' => $method->title,
                    'url' => ReportTargets::url($method),
                ];
            }
        );

        Experience::query()->whereIn('id', $experienceIds)->with('method.topic:id,slug')->get()->each(
            function (Experience $experience) use (&$contexts): void {
                $contexts['experience:'.$experience->id] = [
                    'id' => $experience->id,
                    'type' => 'experience',
                    'title' => 'Experience on '.$experience->method->title,
                    'url' => route('methods.show', [$experience->method->topic, $experience->method], false).'#experiences',
                ];
            }
        );

        $result = [];
        foreach ($messages as $message) {
            if ($message->context_type === 'method' && $message->context_id !== null && isset($contexts[$message->context_id])) {
                $result[$message->id] = $contexts[$message->context_id];
            } elseif ($message->context_type === 'experience' && $message->context_id !== null && isset($contexts['experience:'.$message->context_id])) {
                $result[$message->id] = $contexts['experience:'.$message->context_id];
            }
        }

        return $result;
    }

    /** @return array{id: int, type: string, title: string, url: string}|null */
    public static function serialize(Method|Experience|null $target): ?array
    {
        return match (true) {
            $target instanceof Method => [
                'id' => $target->id,
                'type' => 'method',
                'title' => $target->title,
                'url' => ReportTargets::url($target),
            ],
            $target instanceof Experience => [
                'id' => $target->id,
                'type' => 'experience',
                'title' => 'Experience on '.$target->method->title,
                'url' => route('methods.show', [$target->method->topic, $target->method], false).'#experiences',
            ],
            default => null,
        };
    }
}
