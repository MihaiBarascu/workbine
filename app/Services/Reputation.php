<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class Reputation
{
    public const VERSION = 1;

    public const SUPPORTER_LIMIT = 25;

    /** @return array{score: int, saves: int, worked: int, partly: int, supporters: int, limited_points: int} */
    public function forMember(User $member): array
    {
        // Use current, visible source records so removal, changed outcomes and moderation
        // cannot leave an inflated cached balance. These joins deliberately mirror visibility.
        $saves = DB::table('saved_topics')
            ->join('topics', 'topics.id', '=', 'saved_topics.topic_id')
            ->join('users as supporters', 'supporters.id', '=', 'saved_topics.user_id')
            ->where('topics.user_id', $member->id)
            ->where('supporters.id', '!=', $member->id)
            ->whereNotNull('supporters.email_verified_at')
            ->whereNull('topics.hidden_at')
            ->selectRaw('supporters.id as supporter_id, topics.id as topic_id, 1 as save_points, 0 as experience_points');

        $experiences = DB::table('experiences')
            ->join('methods', 'methods.id', '=', 'experiences.method_id')
            ->join('topics', 'topics.id', '=', 'methods.topic_id')
            ->join('users as supporters', 'supporters.id', '=', 'experiences.user_id')
            ->where('methods.user_id', $member->id)
            ->where('supporters.id', '!=', $member->id)
            ->whereNotNull('supporters.email_verified_at')
            ->whereNull('topics.hidden_at')->whereNull('methods.hidden_at')->whereNull('experiences.hidden_at')
            ->whereIn('experiences.outcome', ['worked', 'partly'])
            ->selectRaw("supporters.id as supporter_id, topics.id as topic_id, 0 as save_points, CASE WHEN experiences.outcome = 'worked' THEN 5 ELSE 2 END as experience_points");

        // Splitting one approach into several methods must not multiply one person's points.
        $topics = DB::query()->fromSub($saves->unionAll($experiences), 'signals')
            ->select(['supporter_id', 'topic_id'])
            ->selectRaw('MAX(save_points) as saves, MAX(experience_points) as outcome_points')
            ->groupBy('supporter_id', 'topic_id');

        $supporters = DB::query()->fromSub($topics, 'topic_signals')
            ->select('supporter_id')
            ->selectRaw('SUM(saves) as saves, SUM(saves + outcome_points) as points')
            ->selectRaw('SUM(CASE WHEN outcome_points = 5 THEN 1 ELSE 0 END) as worked')
            ->selectRaw('SUM(CASE WHEN outcome_points = 2 THEN 1 ELSE 0 END) as partly')
            ->groupBy('supporter_id');

        $result = DB::query()->fromSub($supporters, 'supporter_signals')
            ->selectRaw('COALESCE(SUM(CASE WHEN points > ? THEN ? ELSE points END), 0) as score', [self::SUPPORTER_LIMIT, self::SUPPORTER_LIMIT])
            ->selectRaw('COALESCE(SUM(saves), 0) as saves, COALESCE(SUM(worked), 0) as worked, COALESCE(SUM(partly), 0) as partly, COUNT(*) as supporters, COALESCE(SUM(points), 0) as raw_points')
            ->first();

        return [
            'score' => (int) $result->score,
            'saves' => (int) $result->saves,
            'worked' => (int) $result->worked,
            'partly' => (int) $result->partly,
            'supporters' => (int) $result->supporters,
            'limited_points' => (int) $result->raw_points - (int) $result->score,
        ];
    }
}
