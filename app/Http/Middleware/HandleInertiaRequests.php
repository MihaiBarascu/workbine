<?php

namespace App\Http\Middleware;

use App\Models\CommunityNotification;
use App\Services\ImageUploads;
use App\Support\TopicDiscovery;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'communityCategories' => TopicDiscovery::categories(),
            'unreadNotifications' => fn () => $user === null ? 0 : CommunityNotification::query()->visible()->where('user_id', $user->id)->whereNull('read_at')->count(),
            'canModerate' => $user?->can('moderate') ?? false,
            'reportsEnabled' => (bool) config('community.reports_enabled'),
            'auth' => [
                'user' => $user === null ? null : [...$user->toArray(), 'avatar_url' => $user->avatarUrl()],
            ],
            'media' => ['enabled' => ImageUploads::enabled(), 'maxUploadMb' => (int) config('media.max_upload_kb') / 1024],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
