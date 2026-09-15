<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
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
        Method::factory()->create(['topic_id' => $topic->id]);
        $url = route('topics.show', $topic);

        $response = $this->get($url)
            ->assertOk()
            ->assertSee('<meta property="og:title" content="A &lt;script&gt;test&lt;/script&gt; topic"', false)
            ->assertSee('<meta name="description" content="A practical topic description for search and link previews."', false)
            ->assertSee('<link rel="canonical" href="'.$url.'"', false)
            ->assertSee('<meta name="robots" content="index,follow"', false)
            ->assertSee('<script type="application/ld+json" inertia="structured-data">', false)
            ->assertDontSee('<script>test</script>', false);

        $structuredData = $this->structuredData($response);

        $this->assertSame('https://schema.org', $structuredData['@context']);
        $this->assertSame('DiscussionForumPosting', $structuredData['@type']);
        $this->assertSame($url, $structuredData['url']);
        $this->assertSame($topic->title, $structuredData['headline']);
        $this->assertSame($topic->description, $structuredData['text']);
        $this->assertSame($topic->user->name, $structuredData['author']['name']);
        $this->assertSame(route('members.show', ['username' => $topic->user->username]), $structuredData['author']['url']);
        $this->assertSame(1, $structuredData['commentCount']);
        $this->assertSame($topic->created_at?->toIso8601String(), $structuredData['datePublished']);
    }

    public function test_topic_and_method_pages_expose_real_navigation_breadcrumbs(): void
    {
        $topic = Topic::factory()->create(['title' => 'Organize a shared workshop']);
        $method = Method::factory()->create([
            'topic_id' => $topic->id,
            'title' => 'Reset the workbench after every job',
        ]);
        $topicUrl = route('topics.show', $topic);
        $methodUrl = route('methods.show', [$topic, $method]);

        $topicBreadcrumbs = $this->structuredData(
            $this->get($topicUrl)->assertOk(),
            'breadcrumbs',
        );
        $methodResponse = $this->get($methodUrl)
            ->assertOk()
            ->assertSee('<meta name="robots" content="index,follow"', false);
        $methodBreadcrumbs = $this->structuredData($methodResponse, 'breadcrumbs');

        $this->assertSame('BreadcrumbList', $topicBreadcrumbs['@type']);
        $this->assertSame('Topics', $topicBreadcrumbs['itemListElement'][0]['name']);
        $this->assertSame(route('topics.index'), $topicBreadcrumbs['itemListElement'][0]['item']);
        $this->assertSame($topic->title, $topicBreadcrumbs['itemListElement'][1]['name']);
        $this->assertSame($topicUrl, $topicBreadcrumbs['itemListElement'][1]['item']);

        $this->assertSame('BreadcrumbList', $methodBreadcrumbs['@type']);
        $this->assertSame('Topics', $methodBreadcrumbs['itemListElement'][0]['name']);
        $this->assertSame($topic->title, $methodBreadcrumbs['itemListElement'][1]['name']);
        $this->assertSame($topicUrl, $methodBreadcrumbs['itemListElement'][1]['item']);
        $this->assertSame($method->title, $methodBreadcrumbs['itemListElement'][2]['name']);
        $this->assertSame($methodUrl, $methodBreadcrumbs['itemListElement'][2]['item']);
    }

    public function test_member_profile_has_indexable_metadata_and_profile_structured_data(): void
    {
        $member = User::factory()->create([
            'name' => 'Practical <Member>',
            'username' => 'practical-member',
            'bio' => 'I share practical lessons from projects I have actually tried.',
        ]);
        Topic::factory()->create(['user_id' => $member->id]);
        $url = route('members.show', ['username' => $member->username]);

        $response = $this->get($url)
            ->assertOk()
            ->assertSee('<title>Practical &lt;Member&gt; — Community profile - '.e(config('app.name', 'Workbine')).'</title>', false)
            ->assertSee('<meta name="description" content="I share practical lessons from projects I have actually tried."', false)
            ->assertSee('<link rel="canonical" href="'.$url.'"', false)
            ->assertSee('<meta name="robots" content="index,follow"', false)
            ->assertSee('<meta property="og:type" content="profile"', false);

        $structuredData = $this->structuredData($response);

        $this->assertSame('ProfilePage', $structuredData['@type']);
        $this->assertSame($url, $structuredData['url']);
        $this->assertSame('Person', $structuredData['mainEntity']['@type']);
        $this->assertSame($member->name, $structuredData['mainEntity']['name']);
        $this->assertSame($member->username, $structuredData['mainEntity']['alternateName']);
        $this->assertSame((string) $member->id, $structuredData['mainEntity']['identifier']);
        $this->assertSame($url, $structuredData['mainEntity']['url']);
        $this->assertSame($member->bio, $structuredData['mainEntity']['description']);
        $this->assertSame(1, $structuredData['mainEntity']['agentInteractionStatistic']['userInteractionCount']);
    }

    public function test_filtered_member_profile_variants_are_not_indexed(): void
    {
        $member = User::factory()->create();
        Topic::factory()->create(['user_id' => $member->id]);
        $canonical = route('members.show', ['username' => $member->username]);

        $this->get(route('members.show', ['username' => $member->username, 'view' => 'topics']))
            ->assertOk()
            ->assertSee('<link rel="canonical" href="'.$canonical.'"', false)
            ->assertSee('<meta name="robots" content="noindex,follow"', false);
    }

    public function test_sitemap_lists_only_visible_content_and_contributor_profiles(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id]);
        $topicAuthor = $topic->user;
        $methodAuthor = $method->user;
        $emptyMember = User::factory()->create();

        $hiddenTopic = Topic::factory()->create();
        $hiddenTopicAuthor = $hiddenTopic->user;
        $hiddenTopic->forceFill(['hidden_at' => now()])->save();

        $hiddenMethod = Method::factory()->create(['topic_id' => $topic->id]);
        $hiddenMethodAuthor = $hiddenMethod->user;
        $hiddenMethod->forceFill(['hidden_at' => now()])->save();

        $this->get(route('sitemap'))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', false)
            ->assertSee(route('home'), false)
            ->assertSee(route('community.guide'), false)
            ->assertSee(route('members.show', ['username' => $topicAuthor->username]), false)
            ->assertSee(route('members.show', ['username' => $methodAuthor->username]), false)
            ->assertSee(route('topics.show', $topic), false)
            ->assertSee(route('methods.show', [$topic, $method]), false)
            ->assertDontSee(route('members.show', ['username' => $emptyMember->username]), false)
            ->assertDontSee(route('members.show', ['username' => $hiddenTopicAuthor->username]), false)
            ->assertDontSee(route('members.show', ['username' => $hiddenMethodAuthor->username]), false)
            ->assertDontSee(route('topics.show', $hiddenTopic), false)
            ->assertDontSee(route('methods.show', [$topic, $hiddenMethod]), false);
    }

    /** @return array<string, mixed> */
    private function structuredData(TestResponse $response, string $key = 'structured-data'): array
    {
        $matched = preg_match(
            '#<script type="application/ld\+json" inertia="'.preg_quote($key, '#').'">(.*?)</script>#s',
            $response->getContent(),
            $matches,
        );

        $this->assertSame(1, $matched, 'Expected structured-data JSON-LD block for '.$key.'.');

        return json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    }
}
