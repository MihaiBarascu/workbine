<?php

namespace App\Http\Requests;

use App\Support\RichText;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMethodRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        RichText::prepare($this, '');
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'body_document' => ['nullable', 'array'],
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:10000'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
        ];
    }
}
