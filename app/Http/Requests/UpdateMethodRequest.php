<?php

namespace App\Http\Requests;

use App\Models\Method;

class UpdateMethodRequest extends StoreMethodRequest
{
    public function authorize(): bool
    {
        $method = $this->route('method');

        return $method instanceof Method && $this->user()?->getAuthIdentifier() === $method->user_id;
    }

    public function rules(): array
    {
        return [
            ...parent::rules(),
            'revision' => ['required', 'string', 'size:64'],
        ];
    }
}
