<?php

namespace App\Http\Requests;

use App\Models\Method;
use App\Support\Photos;
use App\Support\RichText;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExperienceRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        RichText::prepare($this, '');
    }

    public function authorize(): bool
    {
        $method = $this->route('method');

        return $method instanceof Method
            && $this->user() !== null
            && $this->user()->getAuthIdentifier() !== $method->user_id;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'method_revision' => ['required', 'string', 'size:64'],
            'experience_revision' => ['required', 'string', 'max:64'],
            'body_document' => ['nullable', 'array'],
            'outcome' => ['required', Rule::in(['worked', 'partly', 'did_not_work'])],
            'body' => ['required', 'string', 'max:5000'],
            'evidence_url' => ['nullable', 'url:http,https', 'max:2048'],
            'tried_on' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            ...Photos::rules('photos'),
            // Pages opened before galleries still offer the single evidence photo: ask to reload.
            'evidence_image' => ['prohibited'],
            'remove_evidence_image' => ['prohibited'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        $outdated = __('This page is out of date. Copy your text, reload the page and add photos in the gallery.');

        return ['evidence_image.prohibited' => $outdated, 'remove_evidence_image.prohibited' => $outdated];
    }
}
