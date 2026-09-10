<?php

namespace App\Http\Requests;

use App\Models\Method;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExperienceRequest extends FormRequest
{
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
            'outcome' => ['required', Rule::in(['worked', 'partly', 'did_not_work'])],
            'body' => ['required', 'string', 'min:20', 'max:5000'],
            'evidence_url' => ['nullable', 'url:http,https', 'max:2048'],
            'tried_on' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }
}
