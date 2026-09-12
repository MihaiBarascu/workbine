<?php

namespace App\Http\Controllers;

use App\Models\CommunityNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CommunityNotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $notifications = CommunityNotification::query()->visible()->where('user_id', $request->user()?->getAuthIdentifier())
            ->with(['actor.avatarImage', 'method.topic'])->latest('id')->paginate(20)
            ->through(fn (CommunityNotification $item): array => [
                'id' => $item->id,
                'actor' => ['name' => $item->actor->name, 'username' => $item->actor->username, 'avatar_url' => $item->actor->avatarUrl()],
                'title' => $item->experience_id === null ? $item->method->topic->title : $item->method->title,
                'kind' => $item->experience_id === null ? 'method' : 'response',
                'read' => $item->read_at !== null,
                'created_at' => $item->created_at->toIso8601String(),
            ]);
        if ($notifications->currentPage() > $notifications->lastPage()) {
            return to_route('notifications.index', ['page' => $notifications->lastPage()]);
        }

        $response = Inertia::render('notifications/index', ['notifications' => $notifications])->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }

    public function open(Request $request, int $notification): RedirectResponse
    {
        $item = CommunityNotification::query()->visible()->where('user_id', $request->user()?->getAuthIdentifier())->findOrFail($notification);
        if ($item->read_at === null) {
            $item->update(['read_at' => now()]);
        }

        return redirect()->to($item->destination());
    }

    public function readAll(Request $request): RedirectResponse
    {
        CommunityNotification::query()->visible()->where('user_id', $request->user()?->getAuthIdentifier())->whereNull('read_at')->update(['read_at' => now()]);

        return to_route('notifications.index');
    }
}
