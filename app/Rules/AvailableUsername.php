<?php

namespace App\Rules;

use App\Models\User;
use App\Support\Usernames;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AvailableUsername implements ValidationRule
{
    public function __construct(private readonly int $userId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Usernames::isValid($value)) {
            $fail('Choose a username with 3–30 lowercase letters, numbers or hyphens, starting with a letter. Official names are reserved.')->translate();

            return;
        }

        if (User::query()->where('username', $value)->whereKeyNot($this->userId)->exists()) {
            $fail('This username is already taken.')->translate();
        }
    }
}
