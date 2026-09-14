<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSeoTest extends TestCase
{
    use RefreshDatabase;

    public function test_discovery_has_indexable_metadata_and_filtered_variants_do_not(): void
    {
        $home = route('home');
        $appName = config('app.name', 'Workbine');

        $this->get($home)
            ->assertOk()
            ->assertSee('<title>Practical knowledge from real experience - '.e($appName).'</title>', false)
            ->assertSee('<meta name="description" content="Discover practical methods people actually use, compare different approaches, and learn from real experiences."', false)
            ->assertSee('<link rel="canonical" href="'.$home.'"', false)
            ->assertSee('<meta name="robots" content="index,follow"', false);

        $this->get(route('topics.index', ['q' => 'client']))
            ->assertOk()
            ->assertSee('<link rel="canonical" href="'.$home.'"', false)
            ->assertSee('<meta name="robots" content="noindex,follow"', false);
    }

    public function test_topic_metadata_is_available_without_javascript_and_escapes_content(): void
    {
        $topic = Topic::factory()->create([
            'title' => 'A <script>test</script> topic',
            'description' => 'A practical topic description for search and link previews.',
        ]);
        $url = route('topics.show', $topic);

        $this->get($url)
            ->assertOk()
            ->assertSee('<meta property="og:title" content="A &lt;script&gt;test&lt;/script&gt; topic"', false)
            ->assertSee('<meta name="description" content="A practical topic description for search and link previews."', false)
            ->assertSee('<link rel="canonical" href="'.$url.'"', false)
            ->assertSee('<meta name="robots" content="index,follow"', false)
            ->assertDontSee('<script>test</script>', false);
    }

    public function test_sitemap_lists_only_visible_topics_and_methods(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id]);

        $hiddenTopic = Topic::factory()->create();
        $hiddenTopic->forceFill(['hidden_at' => now()])->save();

        $hiddenMethod = Method::factory()->create(['topic_id' => $topic->id]);
        $hiddenMethod->forceFill(['hidden_at' => now()])->save();

        $this->get(route('sitemap'))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', false)
            ->assertSee(route('home'), false)
            ->assertSee(route('community.guide'), false)
            ->assertSee(route('topics.show', $topic), false)
            ->assertSee(route('methods.show', [$topic, $method]), false)
            ->assertDontSee(route('topics.show', $hiddenTopic), false)
            ->assertDontSee(route('methods.show', [$topic, $hiddenMethod]), false);
    }
}
