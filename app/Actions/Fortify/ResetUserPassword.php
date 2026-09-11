<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use App\Services\UserSessions;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    public function __construct(private UserSessions $sessions) {}

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $user->getConnection()->transaction(function () use ($user, $input): void {
            if (! $user->hasVerifiedEmail()) {
                // A preclaimed, unverified account may contain credentials set by someone
                // other than the mailbox owner who just proved control with the reset token.
                $user->passkeys()->delete();
                $user->forceFill([
                    'google_id' => null,
                    'avatar' => null,
                    'two_factor_secret' => null,
                    'two_factor_recovery_codes' => null,
                    'two_factor_confirmed_at' => null,
                ]);
            }

            $user->forceFill([
                'password' => $input['password'],
            ])->save();

            $this->sessions->revoke($user);
        });
    }
}
