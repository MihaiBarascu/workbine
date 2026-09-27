<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddReleaseRevision
{
    /**
     * Report the commit baked into the release image on the health check, so a
     * deployment can prove which revision is serving traffic.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $revision = config('app.revision');

        if (is_string($revision) && $revision !== '' && $request->is('up')) {
            $response->headers->set('X-Workbine-Revision', $revision);
        }

        return $response;
    }
}
