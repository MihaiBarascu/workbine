<?php

namespace Tests\Feature;

use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ImageUploads;
use App\Support\ContributionRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RichTextTest extends TestCase
{
    use RefreshDatabase;

    private function richDocument(string $text = 'Here is how I made this work.', array $extra = []): string
    {
        return json_encode(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text, 'marks' => [['type' => 'bold']]]]], ...$extra]], JSON_THROW_ON_ERROR);
    }

    private function editorImage(User $user): MediaImage
    {
        return MediaImage::query()->findOrFail($this->actingAs($user)->postJson('/editor/images', ['image' => UploadedFile::fake()->image('photo.png')])->assertCreated()->json('id'));
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['media.enabled' => true, 'media.disk' => 'public']);
    }

    public function test_the_shared_document_saves_formatting_and_derives_searchable_text_for_methods_and_responses(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->create();
        $this->actingAs($author)->post(route('methods.store', $topic), ['title' => 'A practical approach', 'body' => 'Forged preview', 'body_document' => $this->richDocument()])->assertSessionHasNoErrors();
        $method = $topic->methods()->firstOrFail();
        $this->assertSame('Here is how I made this work.', $method->body);
        $this->assertSame([['type' => 'bold']], $method->body_document['content'][0]['content'][0]['marks']);
        $member = User::factory()->create();
        $this->actingAs($member)->put(route('experiences.store', [$topic, $method]), ['method_revision' => ContributionRevision::token($method), 'outcome' => 'worked', 'body_document' => $this->richDocument('Worked for me.')])->assertSessionHasNoErrors();
        $this->get(route('experiences.index', [$topic, $method]))->assertInertia(fn (Assert $page) => $page->has('experiences.data.0.body_document')->where('experiences.data.0.body', 'Worked for me.'));
    }

    public function test_email_links_survive_saving_a_method_and_an_experience(): void
    {
        $topic = Topic::factory()->create();
        $document = json_encode(['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
            ['type' => 'text', 'text' => 'Contact the business: '],
            ['type' => 'text', 'text' => 'contact@example.com', 'marks' => [['type' => 'bold'], ['type' => 'link', 'attrs' => ['href' => 'mailto:contact@example.com']]]],
        ]]]], JSON_THROW_ON_ERROR);
        $this->actingAs(User::factory()->create())->post(route('methods.store', $topic), ['title' => 'Business website', 'body_document' => $document])->assertSessionHasNoErrors();
        $method = $topic->methods()->firstOrFail();
        $this->assertStringContainsString('mailto:contact@example.com', $method->body);
        $this->assertSame('mailto:contact@example.com', $method->body_document['content'][0]['content'][1]['marks'][1]['attrs']['href']);
        $this->actingAs(User::factory()->create())->put(route('experiences.store', [$topic, $method]), ['method_revision' => ContributionRevision::token($method), 'outcome' => 'worked', 'body_document' => $document])->assertSessionHasNoErrors();
        $this->assertSame($method->body_document, $method->experiences()->firstOrFail()->body_document);
    }

    public function test_rejected_links_identify_the_text_to_fix_without_saving(): void
    {
        $topic = Topic::factory()->create();
        $this->actingAs(User::factory()->create());
        foreach (['javascript:alert(1)', 'mailto:invalid', 'mailto:a@example.com?subject=Hello', 'mailto:a@example.com%0aBcc:b@example.com', 'ftp://example.com/file', 'https://'.str_repeat('a', 2050).'.com'] as $href) {
            $document = $this->richDocument(extra: [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Contact the business', 'marks' => [['type' => 'link', 'attrs' => ['href' => $href]]]]]]]);
            $response = $this->postJson(route('methods.store', $topic), ['title' => 'Business website', 'body_document' => $document])->assertUnprocessable();
            $this->assertStringContainsString('The link on “Contact the business”', $response->json('errors.body.0'));
            $this->assertStringContainsString('mailto:', $response->json('errors.body.0'));
        }
        $this->assertSame(0, $topic->methods()->count());
    }

    public function test_document_limits_explain_how_to_recover(): void
    {
        $topic = Topic::factory()->create();
        $this->actingAs(User::factory()->create());
        $cases = [
            [$this->richDocument(extra: array_fill(0, 11, ['type' => 'image', 'attrs' => ['imageId' => 1]])), 'up to 10 photos'],
            [$this->richDocument(extra: [['type' => 'image', 'attrs' => ['src' => 'https://example.com/photo.png']]]), 'use the Photo button'],
            [$this->richDocument(extra: [['type' => 'image', 'attrs' => ['imageId' => 1, 'alt' => str_repeat('a', 301)]]]), '300 characters'],
            [$this->richDocument(str_repeat('a', 150001)), 'too much formatting'],
            [$this->richDocument(extra: array_fill(0, 1501, ['type' => 'paragraph'])), 'deeply nested lists'],
            ['invalid JSON', 'Paste it as plain text'],
        ];
        foreach ($cases as [$document, $message]) {
            $response = $this->postJson(route('methods.store', $topic), ['title' => 'Business website', 'body_document' => $document])->assertUnprocessable();
            $this->assertStringContainsString($message, $response->json('errors.body.0'));
        }
        $this->assertSame(0, $topic->methods()->count());
    }

    public function test_inline_photos_are_owned_normalized_retained_by_pruning_and_detached_after_editing(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();
        $image = $this->editorImage($user);
        $node = ['type' => 'image', 'attrs' => ['imageId' => $image->id, 'src' => 'https://untrusted.example/track', 'alt' => 'My result']];
        $this->post(route('methods.store', $topic), ['title' => 'My photos', 'body_document' => $this->richDocument(extra: [$node])])->assertSessionHasNoErrors();
        $method = $topic->methods()->firstOrFail();
        $this->assertSame($image->url(), $method->body_document['content'][1]['attrs']['src']);
        $this->assertSame($method->id, $image->fresh()->rich_method_id);
        $this->travel(2)->hours();
        app(ImageUploads::class)->prune();
        Storage::disk('public')->assertExists($image->path);
        $this->patch(route('methods.update', [$topic, $method]), ['title' => $method->title, 'body_document' => $this->richDocument(), 'revision' => ContributionRevision::token($method)])->assertSessionHasNoErrors();
        app(ImageUploads::class)->prune();
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_another_members_image_and_images_already_attached_elsewhere_cannot_be_claimed(): void
    {
        $owner = User::factory()->create();
        $image = $this->editorImage($owner);
        $topic = Topic::factory()->create();
        $payload = ['title' => 'Photos', 'body_document' => $this->richDocument(extra: [['type' => 'image', 'attrs' => ['imageId' => $image->id]]])];
        $this->actingAs(User::factory()->create())->post(route('methods.store', $topic), $payload)->assertSessionHasErrors('body');
        $this->assertSame(0, $topic->methods()->count());
        $this->actingAs($owner)->post(route('methods.store', $topic), $payload)->assertSessionHasNoErrors();
        $this->post(route('methods.store', $topic), $payload)->assertSessionHasErrors('body');
        $this->assertSame(1, $topic->methods()->count());
    }

    public function test_topic_creation_atomically_includes_a_method_with_inline_photos(): void
    {
        $user = User::factory()->create();
        $image = $this->editorImage($user);
        $this->post(route('topics.store'), ['title' => 'A subject', 'include_method' => true, 'method_title' => 'My approach', 'method_body_document' => $this->richDocument(extra: [['type' => 'image', 'attrs' => ['imageId' => $image->id]]])])->assertSessionHasNoErrors();
        $this->assertNotNull($image->fresh()->rich_method_id);
        $this->post(route('topics.store'), ['title' => 'Topic only', 'include_method' => false, 'method_body_document' => 'invalid'])->assertSessionHasNoErrors();
    }

    public function test_unsafe_links_unsupported_nodes_excessive_images_and_empty_explanations_are_rejected(): void
    {
        $this->actingAs(User::factory()->create());
        $topic = Topic::factory()->create();
        $bad = [
            ['type' => 'doc', 'content' => [['type' => 'script', 'text' => 'alert(1)']]],
            ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'click', 'marks' => [['type' => 'link', 'attrs' => ['href' => 'javascript:alert(1)']]]]]]]],
            ['type' => 'doc', 'content' => [['type' => 'paragraph']]],
            ['type' => 'doc', 'content' => array_fill(0, 11, ['type' => 'image', 'attrs' => ['imageId' => 1]])],
        ];
        foreach ($bad as $document) {
            $this->post(route('methods.store', $topic), ['title' => 'Test', 'body_document' => json_encode($document)])->assertSessionHasErrors('body');
        }
        $this->assertSame(0, $topic->methods()->count());
    }

    public function test_draft_uploads_are_pruned_and_response_deletion_releases_inline_images(): void
    {
        $user = User::factory()->create();
        $draft = $this->editorImage($user);
        $image = $this->editorImage($user);
        $method = Method::factory()->create();
        $this->put(route('experiences.store', [$method->topic, $method]), ['method_revision' => ContributionRevision::token($method), 'outcome' => 'partly', 'body_document' => $this->richDocument(extra: [['type' => 'image', 'attrs' => ['imageId' => $image->id]]])])->assertSessionHasNoErrors();
        $this->travel(2)->hours();
        app(ImageUploads::class)->prune();
        Storage::disk('public')->assertMissing($draft->path);
        Storage::disk('public')->assertExists($image->path);
        $this->delete(route('experiences.destroy', [$method->topic, $method]))->assertRedirect();
        app(ImageUploads::class)->prune();
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_formatting_only_edits_invalidate_the_method_revision(): void
    {
        $method = Method::factory()->create();
        $before = ContributionRevision::token($method);
        $method->update(['body_document' => json_decode($this->richDocument($method->body), true)]);
        $this->assertNotSame($before, ContributionRevision::token($method));
    }

    public function test_editor_uploads_require_verification_respect_upload_settings_and_publishing_suspension(): void
    {
        $this->postJson('/editor/images', ['image' => UploadedFile::fake()->image('photo.png')])->assertUnauthorized();
        $this->actingAs(User::factory()->unverified()->create())->postJson('/editor/images', ['image' => UploadedFile::fake()->image('photo.png')])->assertForbidden();
        $user = User::factory()->create();
        config(['media.enabled' => false]);
        $this->actingAs($user)->postJson('/editor/images', ['image' => UploadedFile::fake()->image('photo.png')])->assertUnprocessable();
        config(['media.enabled' => true]);
        $user->forceFill(['publishing_suspended_at' => now()])->save();
        $this->postJson('/editor/images', ['image' => UploadedFile::fake()->image('photo.png')])->assertUnprocessable();
        $this->assertSame(0, MediaImage::count());
    }
}
