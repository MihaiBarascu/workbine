<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTopicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'include_method' => ['sometimes', 'boolean'],
            'method_title' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:160'],
            'method_body' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:10000'],
            'method_source_url' => [Rule::excludeIf(! $this->boolean('include_method')), 'nullable', 'url:http,https', 'max:2048'],
        ];
    }
}
