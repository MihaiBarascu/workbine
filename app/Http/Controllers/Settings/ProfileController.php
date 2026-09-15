<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Services\ContentModeration;
use App\Services\ImageUploads;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => true,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();
        if (array_key_exists('social_links', $data) && $data['social_links'] === []) {
            $data['social_links'] = null;
        }
        if (array_key_exists('public_email', $data) && $data['public_email'] === '') {
            $data['public_email'] = null;
        }
        $user->fill($data);

        $publicFields = ['name', 'username', 'bio', 'location', 'website', 'public_email', 'social_links'];
        if ($user->isDirty($publicFields)) {
            app(ContentModeration::class)->text($user, [
                ...$user->only(['name', 'username', 'bio', 'location', 'website', 'public_email']),
                'social_links' => collect($user->social_links ?? [])
                    ->map(fn (array $link): string => $link['platform'].' '.$link['url'])
                    ->implode("\n"),
            ], 'profile', 'name');
        }

        $emailChanged = $user->isDirty('email');

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        try {
            $user->getConnection()->transaction(fn () => $user->save());
        } catch (UniqueConstraintViolationException $exception) {
            if ($exception->index !== 'users_username_unique' && $exception->columns !== ['username']) {
                throw $exception;
            }

            throw ValidationException::withMessages(['username' => __('This username is already taken.')]);
        }

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
            $request->session()->flash('status', 'verification-link-sent');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request, ImageUploads $uploads): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $uploads->deleteAccount($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Inertia::clearHistory();

        return redirect('/');
    }
}
