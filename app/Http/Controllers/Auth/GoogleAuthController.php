<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ContentModeration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    public function redirect(): SymfonyRedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        /** @var SocialiteUser $googleUser */
        $googleUser = Socialite::driver('google')->user();

        $email = $googleUser->getEmail();
        // Treat the provider payload as untrusted even though its SDK documents a string.
        /** @var mixed $googleId */
        $googleId = $googleUser->getId();
        $raw = $googleUser->getRaw();

        abort_unless(
            is_string($googleId) && trim($googleId) !== '',
            403,
            'Google did not provide a valid account identifier.'
        );

        abort_unless(
            is_string($email) && $email !== '' && ($raw['email_verified'] ?? false) === true,
            403,
            'Google did not provide a verified email address.'
        );

        $user = User::query()->where('google_id', $googleId)->first();

        if (! $user) {
            $user = User::query()->where('email', $email)->first();

            abort_if(
                $user?->google_id !== null && $user->google_id !== $googleId,
                409,
                'This email address is already linked to another Google account.'
            );

            if ($user !== null && ! $user->hasVerifiedEmail()) {
                // An unverified local account may have been created by someone else.
                return to_route('login')->withErrors([
                    'email' => __('An account already uses this email. Sign in and confirm its email in account settings before using Google sign-in. You can reset the password if needed.'),
                ]);
            }
        }

        if ($user) {
            $user->forceFill([
                'google_id' => $googleId,
                'avatar' => $googleUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at
                    ?? (strcasecmp($user->email, $email) === 0 ? now() : null),
            ])->save();
        } else {
            $name = $googleUser->getName() ?: 'Member';
            try {
                app(ContentModeration::class)->text(null, ['name' => $name], 'registration', 'name');
            } catch (ValidationException) {
                // Keep Google sign-in available without publishing an unchecked provider name.
                $name = 'Member';
            }
            $user = new User([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'avatar' => $googleUser->getAvatar(),
                'password' => Str::random(64),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        Auth::login($user, remember: true);
        request()->session()->regenerate();

        return redirect()->intended(route('home'));
    }
}
