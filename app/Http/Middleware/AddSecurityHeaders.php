<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    /**
     * Baseline browser protections. Responses that already define a stricter
     * policy for the same header keep their own value.
     *
     * @var array<string, string>
     */
    private const HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'SAMEORIGIN',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
    ];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Vite's tags and the theme script in the root view share this per-response nonce.
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        foreach (self::HEADERS as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        // Report-only: nothing is blocked until real reports show the policy fits every page.
        // The Vite dev server serves scripts from another origin, so it is left out.
        if (str_starts_with((string) $response->headers->get('Content-Type'), 'text/html')
            && ! $response->headers->has('Content-Security-Policy-Report-Only')
            && ! Vite::isRunningHot()) {
            $response->headers->set('Content-Security-Policy-Report-Only', $this->policy($nonce));
            $response->headers->set('Reporting-Endpoints', 'csp="'.route('csp.report').'"');
        }

        return $response;
    }

    private function policy(string $nonce): string
    {
        $media = parse_url((string) config('filesystems.disks.'.config('media.disk').'.url'));
        $mediaOrigin = isset($media['scheme'], $media['host'])
            ? ' '.$media['scheme'].'://'.$media['host'].(isset($media['port']) ? ':'.$media['port'] : '')
            : '';

        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}' https://challenges.cloudflare.com",
            // React style attributes and component libraries set inline styles.
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.googleusercontent.com{$mediaOrigin}",
            "font-src 'self'",
            "connect-src 'self'",
            'frame-src https://challenges.cloudflare.com',
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            'report-uri '.route('csp.report'),
            'report-to csp',
        ]);
    }
}
