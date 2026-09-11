<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Rules\AvailableUsername;
use App\Support\Usernames;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('username'))) {
            $this->merge(['username' => Usernames::normalize($this->input('username'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            'username' => ['sometimes', 'bail', 'required', 'string', 'min:3', 'max:30', new AvailableUsername($this->user()->id)],
            'bio' => ['sometimes', 'nullable', 'string', 'max:500'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'website' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
        ];
    }
}
