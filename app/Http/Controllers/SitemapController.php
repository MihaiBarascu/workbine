<?php

namespace App\Http\Controllers;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $members = User::query()
            ->select(['id', 'name', 'username'])
            ->where(fn ($query) => $query
                ->whereHas('topics')
                ->orWhereHas('methods')
                ->orWhereHas('experiences'))
            ->orderBy('id')
            ->get();

        $topics = Topic::query()
            ->select(['id', 'slug', 'updated_at'])
            ->orderBy('id')
            ->get();

        $methods = Method::query()
            ->select(['id', 'topic_id', 'updated_at'])
            ->with('topic:id,slug')
            ->orderBy('id')
            ->get();

        return response()
            ->view('sitemap', compact('members', 'topics', 'methods'))
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
