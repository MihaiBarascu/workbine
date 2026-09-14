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
            @php
                $appName = config('app.name', 'Workbine');
                $component = $page['component'];
            @endphp

            @if ($component === 'topics/method-show')
                @php
                    $method = $page['props']['method'];
                    $description = mb_substr(\Illuminate\Support\Str::squish($method['body']), 0, 180);
                    $canonicalUrl = $page['props']['canonicalUrl'];
                @endphp
                <title>{{ $method['title'] }} - {{ $appName }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta property="og:title" content="{{ $method['title'] }}" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="article" inertia="og:type">
                <meta property="og:site_name" content="{{ $appName }}" inertia="og:site_name">
                <meta name="twitter:card" content="summary" inertia="twitter:card">
            @elseif ($component === 'topics/show')
                @php
                    $topic = $page['props']['topic'];
                    $description = filled($topic['description'] ?? null)
                        ? mb_substr(\Illuminate\Support\Str::squish($topic['description']), 0, 180)
                        : mb_substr('See practical methods people shared for '.$topic['title'].', plus real experiences from people who tried them.', 0, 180);
                    $canonicalUrl = route('topics.show', $topic['slug']);
                @endphp
                <title>{{ $topic['title'] }} - {{ $appName }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta name="robots" content="index,follow" inertia="robots">
                <meta property="og:title" content="{{ $topic['title'] }}" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="article" inertia="og:type">
                <meta property="og:site_name" content="{{ $appName }}" inertia="og:site_name">
                <meta name="twitter:card" content="summary" inertia="twitter:card">
            @elseif ($component === 'topics/index')
                @php
                    $props = $page['props'];
                    $search = $props['search'] ?? '';
                    $view = $props['view'] ?? 'latest';
                    $sort = $props['sort'] ?? 'newest';
                    $scope = $props['scope'] ?? 'topics';
                    $category = $props['category'] ?? '';
                    $tag = $props['tag'] ?? '';
                    $currentPage = (int) data_get($props, 'topics.current_page', 1);
                    $indexable = $search === ''
                        && $view === 'latest'
                        && $sort === 'newest'
                        && $scope === 'topics'
                        && $category === ''
                        && $tag === ''
                        && $currentPage === 1;
                    $title = $search !== '' ? 'Search: '.$search : 'Practical knowledge from real experience';
                    $description = 'Discover practical methods people actually use, compare different approaches, and learn from real experiences.';
                    $canonicalUrl = route('home');
                @endphp
                <title>{{ $title }} - {{ $appName }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta name="robots" content="{{ $indexable ? 'index,follow' : 'noindex,follow' }}" inertia="robots">
                <meta property="og:title" content="{{ $title }}" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="website" inertia="og:type">
                <meta property="og:site_name" content="{{ $appName }}" inertia="og:site_name">
                <meta name="twitter:card" content="summary" inertia="twitter:card">
            @else
                <title>{{ $appName }}</title>
            @endif
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
