<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Services\Turnstile;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            ...(Turnstile::enabled() ? ['cf-turnstile-response' => ['required', 'string', 'max:2048']] : []),
        ], [
            'cf-turnstile-response.required' => 'Please complete the verification, then create your account.',
            'cf-turnstile-response.string' => 'Please complete the verification again.',
            'cf-turnstile-response.max' => 'Please complete the verification again.',
        ])->validate();

        if (Turnstile::enabled()) {
            app(Turnstile::class)->validate($input['cf-turnstile-response']);
        }

        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
        ]);
    }
}
