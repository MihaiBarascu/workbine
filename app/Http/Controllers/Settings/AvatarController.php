<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarRequest;
use App\Models\MediaImage;
use App\Models\User;
use App\Services\ImageUploads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Throwable;

class AvatarController extends Controller
{
    public function store(AvatarRequest $request, ImageUploads $uploads): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $image = $uploads->store($user, $request->file('avatar'), 'avatar');

        try {
            $previous = DB::transaction(function () use ($user, $image): ?MediaImage {
                $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                $previous = $locked->avatarImage;
                $locked->avatar_image_id = $image->id;
                $locked->save();
                $previous?->update(['pending_deletion' => true]);

                return $previous;
            });
        } catch (Throwable $exception) {
            $uploads->discard($image);
            throw $exception;
        }

        $uploads->discard($previous);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo updated.')]);

        return to_route('profile.edit');
    }

    public function destroy(Request $request, ImageUploads $uploads): RedirectResponse
    {
        $previous = DB::transaction(function () use ($request): ?MediaImage {
            $user = User::query()->whereKey($request->user()->getAuthIdentifier())->lockForUpdate()->firstOrFail();
            $previous = $user->avatarImage;
            $user->avatar_image_id = null;
            $user->save();
            $previous?->update(['pending_deletion' => true]);

            return $previous;
        });

        $uploads->discard($previous);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo removed.')]);

        return to_route('profile.edit');
    }
}
