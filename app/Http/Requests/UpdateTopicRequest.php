<?php

namespace App\Http\Requests;

use App\Models\Topic;
use App\Support\TopicDiscovery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTopicRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->exists('tags') && $this->input('tags') === null) {
            $this->merge(['tags' => []]);
        }
        if (is_string($this->input('tags'))) {
            $this->merge(['tags' => TopicDiscovery::tags($this->input('tags'))]);
        }
    }

    public function authorize(): bool
    {
        $topic = $this->route('topic');

        return $topic instanceof Topic && $this->user()?->getAuthIdentifier() === $topic->user_id;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'category' => ['nullable', Rule::in(array_keys(TopicDiscovery::categories()))],
            'tags' => ['sometimes', 'array', 'max:3'],
            'tags.*' => ['string', 'distinct', 'max:24', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'revision' => ['required', 'string', 'size:64'],
        ];
    }
}
