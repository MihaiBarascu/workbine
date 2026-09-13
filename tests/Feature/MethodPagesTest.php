<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\MethodUpdate;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MethodPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_topic_methods_are_paginated_and_have_bounded_summary_payloads(): void
    {
        $topic = Topic::factory()->create();
        Method::factory()->count(11)->create([
            'topic_id' => $topic->id,
            'body' => str_repeat('A useful detail ', 30),
            'body_document' => ['type' => 'doc'],
        ]);

        $this->get(route('topics.show', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/show')
                ->where('methods.per_page', 10)
                ->where('methods.last_page', 2)
                ->has('methods.data', 10)
                ->where('methods.data.0.body', fn ($body) => is_string($body) && mb_strlen($body) <= 240)
                ->missing('methods.data.0.body_document')
                ->missing('methods.data.0.updates'));
    }

    public function test_method_page_preserves_full_content_and_outcome_counts(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id, 'body_document' => ['type' => 'doc']]);
        $workedUser = User::factory()->create();
        $partlyUser = User::factory()->create();
        MethodUpdate::query()->create(['method_id' => $method->id, 'submission_id' => '00000000-0000-0000-0000-000000000001', 'body' => 'A dated update.']);
        Experience::query()->create(['method_id' => $method->id, 'user_id' => $workedUser->id, 'outcome' => 'worked', 'body' => 'It worked.']);
        Experience::query()->create(['method_id' => $method->id, 'user_id' => $partlyUser->id, 'outcome' => 'partly', 'body' => 'It partly worked.']);

        $this->get(route('methods.show', [$topic, $method]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/method-show')
                ->where('topic.id', $topic->id)
                ->where('topic.title', $topic->title)
                ->where('topic.slug', $topic->slug)
                ->where('canonicalUrl', route('methods.show', [$topic, $method]))
                ->where('method.id', $method->id)
                ->where('method.body', $method->body)
                ->has('method.body_document')
                ->where('method.updates.0.body', 'A dated update.')
                ->where('method.experiences_count', 2)
                ->where('method.worked_count', 1)
                ->where('method.partly_count', 1));
    }

    public function test_method_metadata_is_available_without_javascript_and_escapes_content(): void
    {
        $method = Method::factory()->create(['title' => 'A <script>test</script> approach', 'body' => 'A practical explanation for the link preview.']);
        $url = route('methods.show', [$method->topic, $method]);
        $this->get($url)->assertOk()
            ->assertSee('<meta property="og:title" content="A &lt;script&gt;test&lt;/script&gt; approach"', false)
            ->assertSee('<meta name="description" content="A practical explanation for the link preview."', false)
            ->assertSee('<link rel="canonical" href="'.$url.'"', false)
            ->assertDontSee('<script>test</script>', false);
    }

    public function test_method_page_is_scoped_and_hides_hidden_records(): void
    {
        $topic = Topic::factory()->create();
        $otherTopic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $otherTopic->id]);
        $hidden = Method::factory()->create(['topic_id' => $topic->id, 'hidden_at' => now()]);

        $this->get(route('methods.show', [$topic, $method]))->assertNotFound();
        $this->get(route('methods.show', [$topic, $hidden]))->assertNotFound();

        $hiddenTopic = Topic::factory()->create(['hidden_at' => now()]);
        $visibleMethod = Method::factory()->create(['topic_id' => $hiddenTopic->id]);
        $this->get(route('methods.show', [$hiddenTopic, $visibleMethod]))->assertNotFound();
    }

    public function test_legacy_update_bookmark_redirects_to_method_page_only_for_visible_scoped_updates(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id]);
        $update = MethodUpdate::query()->create(['method_id' => $method->id, 'submission_id' => '00000000-0000-0000-0000-000000000002', 'body' => 'A dated update.']);

        $this->get(route('methods.updates.redirect', [$topic, $update->id]))
            ->assertRedirect(route('methods.show', [$topic, $method]).'#method-update-'.$update->id);

        $otherTopic = Topic::factory()->create();
        $this->get(route('methods.updates.redirect', [$otherTopic, $update->id]))->assertNotFound();

        $method->forceFill(['hidden_at' => now()])->save();
        $this->get(route('methods.updates.redirect', [$topic, $update->id]))->assertNotFound();
    }
}
