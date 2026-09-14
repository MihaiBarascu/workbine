{!! '<?xml version="1.0" encoding="UTF-8"?>' !!}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>{{ route('home') }}</loc>
    </url>
    <url>
        <loc>{{ route('community.guide') }}</loc>
    </url>
    @foreach ($topics as $topic)
        <url>
            <loc>{{ route('topics.show', $topic) }}</loc>
            @if ($topic->updated_at)
                <lastmod>{{ $topic->updated_at->toAtomString() }}</lastmod>
            @endif
        </url>
    @endforeach
    @foreach ($methods as $method)
        <url>
            <loc>{{ route('methods.show', [$method->topic, $method]) }}</loc>
            @if ($method->updated_at)
                <lastmod>{{ $method->updated_at->toAtomString() }}</lastmod>
            @endif
        </url>
    @endforeach
</urlset>
