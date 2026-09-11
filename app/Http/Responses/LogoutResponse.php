<?php

namespace App\Http\Responses;

use Inertia\Inertia;
use Laravel\Fortify\Http\Responses\LogoutResponse as FortifyLogoutResponse;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse extends FortifyLogoutResponse
{
    public function toResponse($request): Response
    {
        // Fortify invalidates the session before resolving this response.
        // The next Inertia visit discards the key for encrypted private pages.
        Inertia::clearHistory();

        return parent::toResponse($request);
    }
}
