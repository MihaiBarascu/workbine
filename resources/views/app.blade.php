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
                $jsonLd = static fn (array $data): string => json_encode(
                    $data,
                    JSON_UNESCAPED_SLASHES
                        | JSON_UNESCAPED_UNICODE
                        | JSON_HEX_TAG
                        | JSON_HEX_AMP
                        | JSON_HEX_APOS
                        | JSON_HEX_QUOT,
                ) ?: '{}';
            @endphp

            @if ($component === 'topics/method-show')
                @php
                    $method = $page['props']['method'];
                    $topic = $page['props']['topic'];
                    $description = mb_substr(\Illuminate\Support\Str::squish($method['body']), 0, 180);
                    $canonicalUrl = $page['props']['canonicalUrl'];
                    $topicUrl = route('topics.show', $topic['slug']);
                    $breadcrumbs = [
                        '@context' => 'https://schema.org',
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            [
                                '@type' => 'ListItem',
                                'position' => 1,
                                'name' => 'Topics',
                                'item' => route('topics.index'),
                            ],
                            [
                                '@type' => 'ListItem',
                                'position' => 2,
                                'name' => $topic['title'],
                                'item' => $topicUrl,
                            ],
                            [
                                '@type' => 'ListItem',
                                'position' => 3,
                                'name' => $method['title'],
                                'item' => $canonicalUrl,
                            ],
                        ],
                    ];
                @endphp
                <title>{{ $method['title'] }} - {{ $appName }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta name="robots" content="index,follow" inertia="robots">
                <meta property="og:title" content="{{ $method['title'] }}" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="article" inertia="og:type">
                <meta property="og:site_name" content="{{ $appName }}" inertia="og:site_name">
                <meta name="twitter:card" content="summary" inertia="twitter:card">
                <script type="application/ld+json" inertia="breadcrumbs">{!! $jsonLd($breadcrumbs) !!}</script>
            @elseif ($component === 'topics/show')
                @php
                    $topic = $page['props']['topic'];
                    $description = filled($topic['description'] ?? null)
                        ? mb_substr(\Illuminate\Support\Str::squish($topic['description']), 0, 180)
                        : mb_substr('See practical methods people shared for '.$topic['title'].', plus real experiences from people who tried them.', 0, 180);
                    $canonicalUrl = route('topics.show', $topic['slug']);
                    $profileUrl = route('members.show', ['username' => $topic['user']['username']]);
                    $structuredData = [
                        '@context' => 'https://schema.org',
                        '@type' => 'DiscussionForumPosting',
                        'url' => $canonicalUrl,
                        'mainEntityOfPage' => $canonicalUrl,
                        'headline' => $topic['title'],
                        'text' => filled($topic['description'] ?? null)
                            ? \Illuminate\Support\Str::squish($topic['description'])
                            : $topic['title'],
                        'author' => [
                            '@type' => 'Person',
                            'name' => $topic['user']['name'],
                            'url' => $profileUrl,
                        ],
                        'datePublished' => $topic['created_at'],
                        'commentCount' => (int) ($topic['methods_count'] ?? 0),
                    ];
                    if (filled($topic['updated_at'] ?? null) && $topic['updated_at'] !== $topic['created_at']) {
                        $structuredData['dateModified'] = $topic['updated_at'];
                    }
                    if (($topic['likes_count'] ?? 0) > 0) {
                        $structuredData['interactionStatistic'] = [
                            '@type' => 'InteractionCounter',
                            'interactionType' => 'https://schema.org/LikeAction',
                            'userInteractionCount' => (int) $topic['likes_count'],
                        ];
                    }
                    $breadcrumbs = [
                        '@context' => 'https://schema.org',
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            [
                                '@type' => 'ListItem',
                                'position' => 1,
                                'name' => 'Topics',
                                'item' => route('topics.index'),
                            ],
                            [
                                '@type' => 'ListItem',
                                'position' => 2,
                                'name' => $topic['title'],
                                'item' => $canonicalUrl,
                            ],
                        ],
                    ];
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
                <script type="application/ld+json" inertia="structured-data">{!! $jsonLd($structuredData) !!}</script>
                <script type="application/ld+json" inertia="breadcrumbs">{!! $jsonLd($breadcrumbs) !!}</script>
            @elseif ($component === 'members/show')
                @php
                    $member = $page['props']['member'];
                    $view = $page['props']['view'] ?? 'methods';
                    $impact = $page['props']['impact'] ?? '';
                    $currentPage = (int) data_get($page['props'], 'contributions.current_page', 1);
                    $indexable = $view === 'methods' && $impact === '' && $currentPage === 1;
                    $canonicalUrl = route('members.show', ['username' => $member['username']]);
                    $description = filled($member['bio'] ?? null)
                        ? mb_substr(\Illuminate\Support\Str::squish($member['bio']), 0, 180)
                        : mb_substr('Practical methods and real experiences shared by '.$member['name'].' on Workbine.', 0, 180);
                    $postCount = (int) data_get($member, 'counts.topics', 0)
                        + (int) data_get($member, 'counts.methods', 0)
                        + (int) data_get($member, 'counts.experiences', 0);
                    $person = [
                        '@type' => 'Person',
                        '@id' => $canonicalUrl.'#member',
                        'name' => $member['name'],
                        'alternateName' => $member['username'],
                        'identifier' => (string) $member['id'],
                        'url' => $canonicalUrl,
                    ];
                    if (filled($member['bio'] ?? null)) {
                        $person['description'] = \Illuminate\Support\Str::squish($member['bio']);
                    }
                    if (filled($member['avatar_url'] ?? null)) {
                        $person['image'] = $member['avatar_url'];
                    }
                    if ($postCount > 0) {
                        $person['agentInteractionStatistic'] = [
                            '@type' => 'InteractionCounter',
                            'interactionType' => 'https://schema.org/WriteAction',
                            'userInteractionCount' => $postCount,
                        ];
                    }
                    $structuredData = [
                        '@context' => 'https://schema.org',
                        '@type' => 'ProfilePage',
                        'url' => $canonicalUrl,
                        'mainEntity' => $person,
                    ];
                @endphp
                <title>{{ $member['name'] }} — Community profile - {{ $appName }}</title>
                <meta name="description" content="{{ $description }}" inertia="description">
                <link rel="canonical" href="{{ $canonicalUrl }}" inertia="canonical">
                <meta name="robots" content="{{ $indexable ? 'index,follow' : 'noindex,follow' }}" inertia="robots">
                <meta property="og:title" content="{{ $member['name'] }} — Community profile" inertia="og:title">
                <meta property="og:description" content="{{ $description }}" inertia="og:description">
                <meta property="og:url" content="{{ $canonicalUrl }}" inertia="og:url">
                <meta property="og:type" content="profile" inertia="og:type">
                <meta property="og:site_name" content="{{ $appName }}" inertia="og:site_name">
                <meta name="twitter:card" content="summary" inertia="twitter:card">
                <script type="application/ld+json" inertia="structured-data">{!! $jsonLd($structuredData) !!}</script>
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
