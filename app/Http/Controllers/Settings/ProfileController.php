<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Notifications\AccountEmailChanged;
use App\Services\ContentModeration;
use App\Services\ImageUploads;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    private const EMAIL_CHANGES_PER_HOUR = 3;

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
        $data = $request->safe()->except('current_password');
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
        $previousEmail = $user->getOriginal('email');
        $previousEmailVerified = $user->getOriginal('email_verified_at') !== null;

        if ($emailChanged) {
            $this->throttleEmailChanges($user->id, $user->email);
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
            // An unverified previous address may belong to someone else, so it is not notified.
            if ($previousEmailVerified && is_string($previousEmail)) {
                Notification::route('mail', $previousEmail)->notify(new AccountEmailChanged);
            }
            $request->session()->flash('status', 'verification-link-sent');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Every email change sends a verification message, so changes are limited per member
     * and per recipient: moving one address between accounts cannot flood it either.
     */
    private function throttleEmailChanges(int $userId, string $email): void
    {
        $keys = ['email-changes:'.$userId, 'email-changes:to:'.sha1(Str::lower($email))];

        foreach ($keys as $key) {
            if (RateLimiter::tooManyAttempts($key, self::EMAIL_CHANGES_PER_HOUR)) {
                throw ValidationException::withMessages([
                    'email' => __('Too many email changes. Please try again in :minutes minutes.', [
                        'minutes' => (int) ceil(RateLimiter::availableIn($key) / 60),
                    ]),
                ]);
            }
        }

        foreach ($keys as $key) {
            RateLimiter::hit($key, 3600);
        }
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
