<?php

namespace App\Http\Requests;

use App\Models\Topic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTopicRequest extends FormRequest
{
    public function authorize(): bool
    {
        $topic = $this->route('topic');

        return $topic instanceof Topic && $this->user()?->getAuthIdentifier() === $topic->user_id;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'revision' => ['required', 'string', 'size:64'],
        ];
    }
}
