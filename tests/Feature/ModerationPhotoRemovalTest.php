<?php

namespace Tests\Feature;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ImageUploads;
use App\Support\ContributionRevision;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class ModerationPhotoRemovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        config(['media.enabled' => true, 'media.disk' => 'public', 'community.reports_enabled' => true]);
    }

    private function editorImage(User $user): MediaImage
    {
        return MediaImage::query()->findOrFail($this->actingAs($user)->postJson(route('editor.images.store'), ['image' => UploadedFile::fake()->image('photo.png')])->assertCreated()->json('id'));
    }

    private function document(string $text, MediaImage $image, string $alt): string
    {
        return json_encode(['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
            ['type' => 'image', 'attrs' => ['imageId' => $image->id, 'alt' => $alt]],
        ]], JSON_THROW_ON_ERROR);
    }

    /** A method with an inline photo, answered by an experience with evidence and an inline photo. */
    private function contributionsWithPhotos(): Method
    {
        $topic = Topic::factory()->create();
        $author = User::factory()->create();
        $this->actingAs($author)->post(route('methods.store', $topic), ['title' => 'My photos', 'body_document' => $this->document('Before the photo.', $this->editorImage($author), 'My result')])
            ->assertSessionHasNoErrors();
        $method = Method::query()->latest('id')->firstOrFail();
        $member = User::factory()->create();
        $this->actingAs($member)->post(route('experiences.store', [$topic, $method]), [
            '_method' => 'put', 'method_revision' => ContributionRevision::token($method), 'experience_revision' => 'new', 'outcome' => 'worked',
            'body_document' => $this->document('It worked for me too.', $this->editorImage($member), 'Their result'),
            'evidence_image' => UploadedFile::fake()->image('evidence.jpg'),
        ])->assertSessionHasNoErrors();

        return $method;
    }

    private function report(Topic|Method|Experience $target, string $type): ContentReport
    {
        return ContentReport::query()->create([
            'user_id' => User::factory()->create()->id, 'target_type' => $type,
            'target_id' => $target->id, 'reason' => 'privacy', 'details' => 'Private report context.',
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        config(['moderation.admin_user_ids' => [(string) $admin->id]]);

        return $admin;
    }

    public function test_moderators_can_delete_the_photos_of_hidden_content_and_of_everything_under_it(): void
    {
        $method = $this->contributionsWithPhotos();
        $photos = MediaImage::all();
        $avatar = User::factory()->create();
        $this->actingAs($avatar)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('avatar.jpg')])->assertSessionHasNoErrors();
        $updatedAt = $method->refresh()->updated_at?->toIso8601String();
        $report = $this->report($method, 'method');

        $this->actingAs($this->admin())->get(route('moderation.show', ['report', $report->id]))
            ->assertInertia(fn (Assert $page) => $page->where('item.photos', 3));
        $this->post(route('moderation.decide', ['report', $report->id]), [
            'action' => 'hide', 'note' => 'Private photos of another person.', 'publishing' => 'unchanged', 'delete_images' => true,
        ])->assertSessionHasNoErrors();

        $this->assertCount(3, $photos);
        foreach ($photos as $photo) {
            Storage::disk('public')->assertMissing($photo->path);
            $this->assertDatabaseMissing('media_images', ['id' => $photo->id]);
        }
        $this->assertNotNull($avatar->refresh()->avatarImage);
        Storage::disk('public')->assertExists($avatar->avatarImage->path);

        $hidden = Method::withoutGlobalScopes()->findOrFail($method->id);
        $this->assertSame('Photo removed by moderation.', $hidden->body_document['content'][1]['content'][0]['text']);
        $this->assertStringNotContainsString('My result', $hidden->body);
        $this->assertStringContainsString('Photo removed by moderation.', $hidden->body);
        $this->assertSame($updatedAt, $hidden->updated_at?->toIso8601String());
        $experience = Experience::withoutGlobalScopes()->where('method_id', $method->id)->firstOrFail();
        $this->assertNull($experience->evidence_image_id);
        $this->assertSame('paragraph', $experience->body_document['content'][1]['type']);

        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'restore', 'note' => 'Restored without the photos.', 'publishing' => 'unchanged'])
            ->assertSessionHasNoErrors();
        $this->get(route('methods.show', [$method->topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('method.body_document.content.1.type', 'paragraph')
            ->where('experiences.data.0.evidence_image', null));
    }

    public function test_hiding_keeps_photos_unless_deletion_is_chosen_for_that_hide(): void
    {
        $method = $this->contributionsWithPhotos();
        $report = $this->report($method, 'method');
        $this->actingAs($this->admin());

        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'hide', 'note' => 'Hidden for review.', 'publishing' => 'unchanged'])
            ->assertSessionHasNoErrors();
        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'dismiss', 'note' => 'Not a violation.', 'publishing' => 'unchanged', 'delete_images' => true])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('media_images', 3);
        foreach (MediaImage::all() as $photo) {
            Storage::disk('public')->assertExists($photo->path);
        }
    }

    public function test_console_review_can_delete_photos_under_a_hidden_topic(): void
    {
        $method = $this->contributionsWithPhotos();
        $report = $this->report($method->topic, 'topic');

        $this->artisan('reports:review', ['id' => $report->id])->expectsOutputToContain('"photos": 3')->assertSuccessful();
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'dismiss', '--note' => 'Not a violation.', '--delete-images' => true])->assertFailed();
        $this->assertDatabaseCount('media_images', 3);

        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'hide', '--note' => 'Confirmed privacy violation.', '--delete-images' => true])
            ->expectsOutputToContain('Photos deleted: 3.')->assertSuccessful();
        $this->assertDatabaseCount('media_images', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_storage_failures_detach_the_photos_and_leave_them_for_the_nightly_cleanup(): void
    {
        $method = $this->contributionsWithPhotos();
        $experience = Experience::query()->firstOrFail();
        $evidence = $experience->evidenceImage;
        $fake = Storage::disk('public');
        $manager = Storage::getFacadeRoot();
        $broken = Mockery::mock(FilesystemAdapter::class);
        $broken->shouldReceive('delete')->andReturn(false);
        Storage::shouldReceive('disk')->with('public')->andReturn($broken);

        $this->assertSame(['deleted' => 0, 'failed' => 2], app(ImageUploads::class)->deleteContributionImages($experience));
        $this->assertNull($experience->refresh()->evidence_image_id);
        $this->assertTrue($evidence->refresh()->pending_deletion);
        // Only the reported experience is affected; the method above it keeps its photo.
        $this->assertFalse(MediaImage::query()->where('rich_method_id', $method->id)->firstOrFail()->pending_deletion);

        Storage::swap($manager);
        $this->artisan('media:prune')->assertSuccessful();
        $fake->assertMissing($evidence->path);
        $this->assertDatabaseCount('media_images', 1);
    }
}
