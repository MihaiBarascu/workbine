<?php

namespace App\Http\Requests;

use App\Support\RichText;
use App\Support\TopicDiscovery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTopicRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->exists('tags') && $this->input('tags') === null) {
            $this->merge(['tags' => []]);
        }
        if (is_string($this->input('tags'))) {
            $this->merge(['tags' => TopicDiscovery::tags($this->input('tags'))]);
        }
        if (! $this->boolean('include_method')) {
            return;
        }
        RichText::prepare($this, 'method_');
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'method_body_document' => [Rule::excludeIf(! $this->boolean('include_method')), 'nullable', 'array'],
            'category' => ['nullable', Rule::in(array_keys(TopicDiscovery::categories()))],
            'tags' => ['sometimes', 'array', 'max:3'],
            'tags.*' => ['string', 'distinct', 'max:24', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'include_method' => ['sometimes', 'boolean'],
            'method_title' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:160'],
            'method_body' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:10000'],
            'method_source_url' => [Rule::excludeIf(! $this->boolean('include_method')), 'nullable', 'url:http,https', 'max:2048'],
        ];
    }
}
