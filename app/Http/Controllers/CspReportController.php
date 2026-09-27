<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Receives Content Security Policy reports while the policy runs in report-only mode.
 * Browsers send them without cookies, so the route sits outside the web middleware group.
 */
class CspReportController extends Controller
{
    private const MAX_BYTES = 16384;

    private const MAX_REPORTS = 10;

    public function __invoke(Request $request): Response
    {
        $raw = $request->getContent();
        $payload = strlen($raw) <= self::MAX_BYTES ? json_decode($raw, true, 8) : null;

        if (is_array($payload)) {
            // report-uri sends {"csp-report": {...}}; the Reporting API sends a list of {type, body}.
            $reports = array_is_list($payload)
                ? array_map(fn (mixed $entry): mixed => is_array($entry) && ($entry['type'] ?? null) === 'csp-violation' ? ($entry['body'] ?? null) : null, $payload)
                : [$payload['csp-report'] ?? null];

            foreach (array_slice(array_filter($reports, is_array(...)), 0, self::MAX_REPORTS) as $report) {
                $this->log($report);
            }
        }

        return response()->noContent();
    }

    /** @param array<mixed> $report */
    private function log(array $report): void
    {
        $blocked = self::string($report, ['blockedURL', 'blocked-uri']);

        // Browser extensions inject their own code; those reports say nothing about the site.
        foreach ([$blocked, self::string($report, ['sourceFile', 'source-file'])] as $url) {
            if (preg_match('/^[a-z-]*-extension:/i', $url) === 1) {
                return;
            }
        }

        Log::warning('Content Security Policy report', [
            'directive' => mb_substr(self::string($report, ['effectiveDirective', 'effective-directive', 'violated-directive']), 0, 64),
            'blocked' => self::origin($blocked),
            'page' => self::routeName(self::string($report, ['documentURL', 'document-uri'])),
            'disposition' => mb_substr(self::string($report, ['disposition']) ?: 'report', 0, 16),
        ]);
    }

    /**
     * @param  array<mixed>  $report
     * @param  list<string>  $keys
     */
    private static function string(array $report, array $keys): string
    {
        foreach ($keys as $key) {
            if (is_string($report[$key] ?? null)) {
                return $report[$key];
            }
        }

        return '';
    }

    /** Only the origin or keyword is kept: full URLs can carry tokens. */
    private static function origin(string $url): string
    {
        $parts = parse_url($url);

        return match (true) {
            $url === '' => 'none',
            in_array($url, ['inline', 'eval', 'wasm-eval', 'self', 'data', 'blob'], true) => $url,
            ! is_array($parts) || ! isset($parts['scheme']) => 'other',
            ! isset($parts['host']) => mb_substr($parts['scheme'], 0, 16),
            default => mb_substr($parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : ''), 0, 255),
        };
    }

    /** Route names identify the page without logging paths such as password-reset tokens. */
    private static function routeName(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path)) {
            return 'unknown';
        }

        try {
            return app('router')->getRoutes()->match(Request::create($path))->getName() ?? 'unnamed';
        } catch (Throwable) {
            return 'unknown';
        }
    }
}
