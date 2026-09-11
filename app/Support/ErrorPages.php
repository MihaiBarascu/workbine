<?php

namespace App\Support;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class ErrorPages
{
    public static function respond(Response $response, Throwable $exception, Request $request): Response
    {
        if (config('app.debug') || $request->is('api/*') || $request->expectsJson() || $response instanceof JsonResponse) {
            return $response;
        }

        $status = $response->getStatusCode();
        $content = match ($status) {
            403 => ['You cannot open this page', 'You do not have permission to view this page or make this change.'],
            404 => ['This page could not be found', 'The link may be out of date, or this contribution may no longer be available.'],
            419 => ['Your session expired', 'Return to the form and refresh it before trying again.'],
            429 => ['Please slow down a little', 'You have made several requests in a short time. Wait a moment before trying again.'],
            500 => ['Something went wrong', 'We could not complete your request. Please try again in a little while.'],
            503 => ['Workbine is temporarily unavailable', 'Please check back in a little while.'],
            default => null,
        };

        if ($content === null) {
            return $response;
        }

        $props = ['status' => $status, 'title' => $content[0], 'description' => $content[1]];

        if ($request->header('X-Inertia')) {
            // Build without shared props: authentication or the database may be the source of the error.
            $page = new InertiaResponse(
                component: 'errors/show',
                sharedProps: [],
                props: $props,
                version: app(HandleInertiaRequests::class)->version($request) ?? '',
            );

            $response->setContent((string) $page->toResponse($request)->getContent());
            $response->headers->set('Content-Type', 'application/json');
            $response->headers->set('X-Inertia', 'true');
        } else {
            // A regular visit needs neither JavaScript, a Vite manifest nor the application layout.
            $response->setContent(view('errors.show', $props)->render());
            $response->headers->set('Content-Type', 'text/html; charset=UTF-8');
        }

        // Keep the original status and headers, including cookies and rate-limit retry information.
        $response->headers->remove('Content-Length');
        $response->setVary('X-Inertia', false);

        return $response;
    }
}
