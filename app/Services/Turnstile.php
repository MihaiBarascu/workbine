<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

final class Turnstile
{
    public static function enabled(): bool
    {
        return (bool) config('services.turnstile.enabled');
    }

    public function validate(string $token): void
    {
        $message = 'Verification is temporarily unavailable. Please try again.';
        $secret = (string) config('services.turnstile.secret_key');
        $hostname = parse_url((string) config('app.url'), PHP_URL_HOST);

        if ($secret === '' || ! $hostname || ! config('services.turnstile.site_key')) {
            throw ValidationException::withMessages(['cf-turnstile-response' => $message]);
        }

        try {
            $response = Http::asForm()->acceptJson()->connectTimeout(3)->timeout(8)
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => $secret,
                    'response' => $token,
                ]);
        } catch (ConnectionException) {
            // Do not log the exception: the request contains a private service key.
            throw ValidationException::withMessages(['cf-turnstile-response' => $message]);
        }

        if (! $response->successful()) {
            throw ValidationException::withMessages(['cf-turnstile-response' => $message]);
        }

        if ($response->json('success') !== true
            || $response->json('action') !== 'register'
            || $response->json('hostname') !== $hostname) {
            throw ValidationException::withMessages([
                'cf-turnstile-response' => 'Please complete the verification again, then create your account.',
            ]);
        }
    }
}
