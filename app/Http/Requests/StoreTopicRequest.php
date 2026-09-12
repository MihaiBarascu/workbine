<?php

namespace App\Http\Requests;

use App\Support\RichText;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTopicRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
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
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'include_method' => ['sometimes', 'boolean'],
            'method_title' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:160'],
            'method_body' => [Rule::excludeIf(! $this->boolean('include_method')), 'required', 'string', 'max:10000'],
            'method_source_url' => [Rule::excludeIf(! $this->boolean('include_method')), 'nullable', 'url:http,https', 'max:2048'],
        ];
    }
}
