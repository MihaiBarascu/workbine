<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
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
            'mustVerifyEmail' => (bool) config('community.email_verification_enabled'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
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
