<?php

namespace App\Http\Requests\Settings;

use App\Services\ImageUploads;
use Illuminate\Foundation\Http\FormRequest;

class AvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['avatar' => ['required', ...ImageUploads::rules()]];
    }
}
