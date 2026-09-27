<?php

namespace App\Http\Middleware;

use App\Services\ImageUploads;
use Closure;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ThrottleImageUploads
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasFile('avatar') && ! $request->hasFile('evidence_image') && ! $request->hasFile('image')) {
            return $next($request);
        }

        $user = $request->user()?->getAuthIdentifier();
        $memberLimits = [
            ['media:hour:'.$user, (int) config('media.uploads_per_hour'), 3600],
            ['media:day:'.$user, (int) config('media.uploads_per_day'), 86400],
        ];

        try {
            // The shared cache lock prevents simultaneous requests passing the same limit.
            $retryAfter = Cache::lock('media:upload-limits', 10)->block(3, function () use ($memberLimits): int {
                foreach ([...$memberLimits, [ImageUploads::GLOBAL_DAILY_KEY, (int) config('media.global_uploads_per_day')]] as [$key, $maximum]) {
                    if (RateLimiter::tooManyAttempts($key, $maximum)) {
                        return max(1, RateLimiter::availableIn($key));
                    }
                }

                // Member attempts count immediately; the global budget waits for an accepted upload.
                foreach ($memberLimits as [$key, $maximum, $seconds]) {
                    RateLimiter::hit($key, $seconds);
                }

                return 0;
            });
        } catch (LockTimeoutException) {
            $retryAfter = 3;
        }

        abort_if($retryAfter > 0, 429, __('Too many image uploads. Please try again later.'), ['Retry-After' => (string) $retryAfter]);

        return $next($request);
    }
}
