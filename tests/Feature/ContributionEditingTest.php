<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContributionEditingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_must_log_in_to_edit_contributions(): void
    {
        $method = Method::factory()->create();
        $topic = $method->topic;

        $this->get(route('topics.edit', $topic))->assertRedirect(route('login'));
        $this->patch(route('topics.update', $topic), [])->assertRedirect(route('login'));
        $this->get(route('methods.edit', [$topic, $method]))->assertRedirect(route('login'));
        $this->patch(route('methods.update', [$topic, $method]), [])->assertRedirect(route('login'));
    }

    public function test_unverified_owners_must_confirm_before_editing_existing_contributions(): void
    {
        $user = User::factory()->unverified()->create();
        $topic = Topic::factory()->for($user)->create();
        $method = Method::factory()->for($user)->for($topic)->create();

        $this->actingAs($user);
        $this->get(route('topics.edit', $topic))->assertRedirect(route('verification.notice'));
        $this->patch(route('topics.update', $topic), [])->assertRedirect(route('verification.notice'));
        $this->get(route('methods.edit', [$topic, $method]))->assertRedirect(route('verification.notice'));
        $this->patch(route('methods.update', [$topic, $method]), [])->assertRedirect(route('verification.notice'));
    }

    public function test_members_cannot_open_or_update_another_members_topic(): void
    {
        $topic = Topic::factory()->create();
        $original = $topic->refresh()->getAttributes();

        $this->actingAs(User::factory()->create());
        $this->get(route('topics.edit', $topic))->assertForbidden();
        $this->patch(route('topics.update', $topic), ['title' => 'Unwanted change'])->assertForbidden();

        $this->assertSame($original, $topic->refresh()->getAttributes());
    }

    public function test_topic_owners_cannot_edit_another_members_method(): void
    {
        $method = Method::factory()->create();
        $original = $method->refresh()->getAttributes();

        $this->actingAs($method->topic->user);
        $this->get(route('methods.edit', [$method->topic, $method]))->assertForbidden();
        $this->patch(route('methods.update', [$method->topic, $method]), ['title' => 'Unwanted change'])->assertForbidden();

        $this->assertSame($original, $method->refresh()->getAttributes());
    }

    public function test_method_editing_is_scoped_to_its_topic_even_for_its_owner(): void
    {
        $method = Method::factory()->create();
        $otherTopic = Topic::factory()->create();

        $this->actingAs($method->user);
        $this->get(route('methods.edit', [$otherTopic, $method]))->assertNotFound();
        $this->patch(route('methods.update', [$otherTopic, $method]), [])->assertNotFound();
    }

    public function test_topic_editor_exposes_only_its_editable_fields_and_revision(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($topic->user)->get(route('topics.edit', $topic))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/edit')
                ->where('topic.id', $topic->id)
                ->where('topic.title', $topic->title)
                ->where('topic.description', $topic->description)
                ->where('topic.slug', $topic->slug)
                ->where('revision', fn ($revision) => is_string($revision) && strlen($revision) === 64)
                ->missing('topic.user')
                ->missing('topic.user_id'));
    }

    public function test_topic_owner_can_edit_without_changing_its_link_or_contributions(): void
    {
        $topic = Topic::factory()->create();
        $method = Method::factory()->create(['topic_id' => $topic->id]);
        $experience = $this->experience($method);
        $originalMethod = $method->refresh()->getAttributes();
        $originalExperience = $experience->refresh()->getAttributes();
        $revision = $this->actingAs($topic->user)->get(route('topics.edit', $topic))->inertiaProps('revision');
        $originalSlug = $topic->slug;
        $originalCreated = $topic->created_at?->toIso8601String();
        $this->travel(1)->day();

        $this->patch(route('topics.update', $topic), [
            'title' => 'A clearer subject for this topic',
            'description' => 'A more specific situation and useful constraints.',
            'revision' => $revision,
            'slug' => 'replace-the-public-link',
            'user_id' => $method->user_id,
            'include_method' => true,
            'method_title' => 'An unwanted extra method',
        ])->assertSessionHasNoErrors()->assertRedirect(route('topics.show', $topic));

        $topic->refresh();
        $this->assertSame('A clearer subject for this topic', $topic->title);
        $this->assertSame('A more specific situation and useful constraints.', $topic->description);
        $this->assertSame($originalSlug, $topic->slug);
        $this->assertSame($topic->user_id, $this->app['auth']->id());
        $this->assertSame($originalCreated, $topic->created_at?->toIso8601String());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());
        $this->assertSame($originalExperience, $experience->refresh()->getAttributes());
        $this->assertDatabaseCount('methods', 1);

        $this->get(route('topics.show', $topic))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('topic.updated_at', $topic->updated_at?->toIso8601String())
                ->where('topic.methods_count', 1));
    }

    public function test_topic_context_can_be_removed(): void
    {
        $topic = Topic::factory()->create();
        $revision = $this->actingAs($topic->user)->get(route('topics.edit', $topic))->inertiaProps('revision');

        $this->patch(route('topics.update', $topic), [
            'title' => $topic->title,
            'description' => '',
            'revision' => $revision,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertNull($topic->refresh()->description);
    }

    public function test_hidden_topics_still_reserve_their_public_slug(): void
    {
        $topic = Topic::factory()->create([
            'title' => 'Automating a small product import',
            'slug' => 'automating-a-small-product-import',
        ]);
        $topic->forceFill(['hidden_at' => now()])->save();

        $this->actingAs(User::factory()->create())->post(route('topics.store'), [
            'title' => $topic->title,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('topics', [
            'slug' => 'automating-a-small-product-import-2',
            'hidden_at' => null,
        ]);
        $this->assertDatabaseCount('topics', 2);
    }

    public function test_invalid_topic_changes_preserve_existing_content(): void
    {
        $topic = Topic::factory()->create();
        $original = $topic->refresh()->getAttributes();
        $revision = $this->actingAs($topic->user)->get(route('topics.edit', $topic))->inertiaProps('revision');

        $this->patch(route('topics.update', $topic), [
            'title' => str_repeat('x', 161),
            'description' => str_repeat('x', 5001),
            'revision' => $revision,
        ])->assertSessionHasErrors(['title', 'description']);

        $this->patch(route('topics.update', $topic), ['title' => '   '])
            ->assertSessionHasErrors(['title', 'revision']);
        $this->assertSame($original, $topic->refresh()->getAttributes());
    }

    public function test_method_editor_contains_the_current_content(): void
    {
        $method = Method::factory()->create(['source_url' => 'https://example.com/original']);

        $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/method-edit')
                ->where('topic.slug', $method->topic->slug)
                ->where('method.id', $method->id)
                ->where('method.title', $method->title)
                ->where('method.body', $method->body)
                ->where('method.source_url', $method->source_url)
                ->where('revision', fn ($revision) => is_string($revision) && strlen($revision) === 64)
                ->missing('method.user')
                ->missing('method.user_id'));
    }

    public function test_method_owner_can_update_content_while_preserving_experiences_and_evidence(): void
    {
        Storage::fake('public');
        $method = Method::factory()->create();
        $experience = $this->experience($method);
        $image = MediaImage::query()->create([
            'user_id' => $experience->user_id,
            'disk' => 'public',
            'path' => 'images/test/evidence.webp',
            'bytes' => 8,
            'width' => 100,
            'height' => 100,
        ]);
        Storage::disk('public')->put($image->path, 'evidence');
        $experience->evidence_image_id = $image->id;
        $experience->save();
        $originalExperience = $experience->refresh()->getAttributes();
        $revision = $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))->inertiaProps('revision');
        $this->travel(1)->day();

        $this->patch(route('methods.update', [$method->topic, $method]), [
            'title' => 'An improved explanation of the same approach',
            'body' => 'Updated steps, with the same original context and result.',
            'source_url' => 'https://example.com/updated-source',
            'revision' => $revision,
            'topic_id' => Topic::factory()->create()->id,
            'user_id' => $experience->user_id,
            'experiences' => [],
        ])->assertSessionHasNoErrors()->assertRedirect(route('topics.show', $method->topic).'#method-'.$method->id);

        $method->refresh();
        $this->assertSame('An improved explanation of the same approach', $method->title);
        $this->assertSame('Updated steps, with the same original context and result.', $method->body);
        $this->assertSame('https://example.com/updated-source', $method->source_url);
        $this->assertSame($method->user_id, $this->app['auth']->id());
        $this->assertSame($originalExperience, $experience->refresh()->getAttributes());
        $this->assertSame($image->id, $experience->evidence_image_id);
        $this->assertFalse($image->refresh()->pending_deletion);
        Storage::disk('public')->assertExists($image->path);

        $this->get(route('topics.show', $method->topic))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('methods.0.id', $method->id)
                ->where('methods.0.experiences_count', 1)
                ->where('methods.0.updated_at', $method->updated_at?->toIso8601String()));
    }

    public function test_method_source_can_be_removed(): void
    {
        $method = Method::factory()->create(['source_url' => 'https://example.com/original']);
        $revision = $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))->inertiaProps('revision');

        $this->patch(route('methods.update', [$method->topic, $method]), [
            'title' => $method->title,
            'body' => $method->body,
            'source_url' => '',
            'revision' => $revision,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertNull($method->refresh()->source_url);
    }

    public function test_invalid_method_changes_preserve_existing_content(): void
    {
        $method = Method::factory()->create();
        $original = $method->refresh()->getAttributes();
        $revision = $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))->inertiaProps('revision');

        $this->patch(route('methods.update', [$method->topic, $method]), [
            'title' => str_repeat('x', 161),
            'body' => str_repeat('x', 10001),
            'source_url' => 'javascript:alert(1)',
            'revision' => $revision,
        ])->assertSessionHasErrors(['title', 'body', 'source_url']);

        $this->patch(route('methods.update', [$method->topic, $method]), [
            'title' => ' ',
            'body' => '',
        ])->assertSessionHasErrors(['title', 'body', 'revision']);
        $this->assertSame($original, $method->refresh()->getAttributes());
    }

    public function test_stale_topic_editor_cannot_overwrite_a_newer_edit_in_the_same_second(): void
    {
        $this->freezeTime();
        $topic = Topic::factory()->create();
        $revision = $this->actingAs($topic->user)->get(route('topics.edit', $topic))->inertiaProps('revision');
        $topic->update(['title' => 'A newer title from another tab']);

        $this->from(route('topics.edit', $topic))->patch(route('topics.update', $topic), [
            'title' => 'A stale title',
            'description' => $topic->description,
            'revision' => $revision,
        ])->assertRedirect(route('topics.edit', $topic))->assertSessionHasErrors('revision');

        $this->assertSame('A newer title from another tab', $topic->refresh()->title);
    }

    public function test_stale_method_editor_cannot_overwrite_a_newer_edit_in_the_same_second(): void
    {
        $this->freezeTime();
        $method = Method::factory()->create();
        $revision = $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))->inertiaProps('revision');
        $method->update(['body' => 'New steps from another tab']);

        $this->from(route('methods.edit', [$method->topic, $method]))
            ->patch(route('methods.update', [$method->topic, $method]), [
                'title' => $method->title,
                'body' => 'Stale steps',
                'revision' => $revision,
            ])->assertRedirect(route('methods.edit', [$method->topic, $method]))->assertSessionHasErrors('revision');

        $this->assertSame('New steps from another tab', $method->refresh()->body);
    }

    public function test_saving_unchanged_contributions_does_not_make_them_look_newer(): void
    {
        $method = Method::factory()->create(['user_id' => User::factory()->create()->id]);
        $topic = $method->topic;
        $topic->update(['user_id' => $method->user_id]);
        $topicUpdated = $topic->updated_at?->toIso8601String();
        $methodUpdated = $method->updated_at?->toIso8601String();
        $topicRevision = $this->actingAs($method->user)->get(route('topics.edit', $topic))->inertiaProps('revision');
        $methodRevision = $this->get(route('methods.edit', [$topic, $method]))->inertiaProps('revision');
        $this->travel(1)->day();

        $this->patch(route('topics.update', $topic), [
            'title' => $topic->title,
            'description' => $topic->description,
            'revision' => $topicRevision,
        ])->assertSessionHasNoErrors()->assertRedirect();
        $this->patch(route('methods.update', [$topic, $method]), [
            'title' => $method->title,
            'body' => $method->body,
            'source_url' => $method->source_url,
            'revision' => $methodRevision,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertSame($topicUpdated, $topic->refresh()->updated_at?->toIso8601String());
        $this->assertSame($methodUpdated, $method->refresh()->updated_at?->toIso8601String());
    }

    private function experience(Method $method): Experience
    {
        return $method->experiences()->create([
            'user_id' => User::factory()->create()->id,
            'outcome' => 'partly',
            'body' => 'This helped in my situation, with a few adjustments.',
            'evidence_url' => 'https://example.com/evidence',
            'tried_on' => '2026-09-01',
        ]);
    }
}
