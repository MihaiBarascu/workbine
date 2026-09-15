<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Rules\AvailableUsername;
use App\Support\Usernames;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('username'))) {
            $this->merge(['username' => Usernames::normalize($this->input('username'))]);
        }

        if (is_string($this->input('public_email'))) {
            $this->merge(['public_email' => trim($this->input('public_email'))]);
        }

        if ($this->has('social_links_present')) {
            $links = $this->input('social_links', []);
            if (is_array($links)) {
                $links = array_values(array_map(function ($link): mixed {
                    if (! is_array($link)) {
                        return $link;
                    }

                    return [
                        'platform' => is_string($link['platform'] ?? null) ? strtolower(trim($link['platform'])) : ($link['platform'] ?? null),
                        'url' => is_string($link['url'] ?? null) ? trim($link['url']) : ($link['url'] ?? null),
                    ];
                }, $links));
            }
            $this->merge(['social_links' => $links]);
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
            'public_email' => ['sometimes', 'nullable', 'email:rfc', 'max:255'],
            'social_links' => ['sometimes', 'nullable', 'array', 'max:5'],
            'social_links.*.platform' => [
                'required',
                'string',
                'distinct:strict',
                Rule::in(['linkedin', 'github', 'x', 'instagram', 'youtube', 'facebook', 'tiktok', 'bluesky', 'mastodon']),
            ],
            'social_links.*.url' => ['required', 'url:http,https', 'max:2048'],
        ];
    }
}
