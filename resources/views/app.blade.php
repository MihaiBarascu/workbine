<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #f8f9fb;
            }

            html.dark {
                background-color: #16181d;
            }
        </style>

        <link rel="icon" href="/favicon.ico?v=workbine-light" sizes="any">
        <link rel="icon" href="/favicon.svg?v=workbine-light" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=workbine-light">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            @if ($page['component'] === 'topics/method-show')
                @php
                    $method = $page['props']['method'];
                    $description = mb_substr(\Illuminate\Support\Str::squish($method['body']), 0, 180);
                    $canonicalUrl = $page['props']['canonicalUrl'];
                @endphp
                <title>{{ $method['title'] }} - {{ config('app.name', 'Workbine') }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta property="og:title" content="{{ $method['title'] }}" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="article" inertia="og:type">
            @else
                <title>{{ config('app.name', 'Workbine') }}</title>
            @endif
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
