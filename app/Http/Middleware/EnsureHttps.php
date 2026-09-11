<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        $url = (string) config('app.url');

        // Docker probes stay internal; local HTTP development remains supported.
        if (app()->isProduction() && str_starts_with($url, 'https://')
            && ! $request->isSecure() && ! $request->is('up')) {
            return redirect()->away(rtrim($url, '/').$request->getRequestUri(), 308);
        }

        return $next($request);
    }
}
