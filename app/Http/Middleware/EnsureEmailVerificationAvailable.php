<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerificationAvailable
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('verification.send') || config('community.email_verification_enabled') || $request->user() === null) {
            return $next($request);
        }

        if ($request->session()->get('status') === 'verification-link-sent') {
            $request->session()->forget('status');
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Email verification is not available yet. You can continue using Workbine.'], 503);
        }

        return Inertia::render('auth/verify-email', [
            'status' => null,
            'verificationAvailable' => false,
        ])->toResponse($request)->setStatusCode(503);
    }
}
