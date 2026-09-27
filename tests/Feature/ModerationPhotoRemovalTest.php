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

    /** A method with a photo, answered by an experience with two photos. */
    private function contributionsWithPhotos(): Method
    {
        $topic = Topic::factory()->create();
        $author = User::factory()->create();
        $methodPhoto = $this->editorImage($author);
        $this->actingAs($author)->post(route('methods.store', $topic), [
            'title' => 'My photos', 'body' => 'Before the photo.',
            'photos_present' => 1, 'photos' => [['id' => $methodPhoto->id, 'caption' => 'My result']],
        ])->assertSessionHasNoErrors();
        $method = Method::query()->latest('id')->firstOrFail();
        $member = User::factory()->create();
        $photos = [$this->editorImage($member), $this->editorImage($member)];
        $this->actingAs($member)->put(route('experiences.store', [$topic, $method]), [
            'method_revision' => ContributionRevision::token($method), 'experience_revision' => 'new', 'outcome' => 'worked', 'body' => 'It worked for me too.',
            'photos_present' => 1, 'photos' => array_map(fn (MediaImage $photo): array => ['id' => $photo->id], $photos),
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

        // Photos live beside the text, so the contributions themselves are untouched.
        $hidden = Method::withoutGlobalScopes()->findOrFail($method->id);
        $this->assertSame('Before the photo.', $hidden->body);
        $this->assertSame($updatedAt, $hidden->updated_at?->toIso8601String());

        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'restore', 'note' => 'Restored without the photos.', 'publishing' => 'unchanged'])
            ->assertSessionHasNoErrors();
        $this->get(route('methods.show', [$method->topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('method.photos', [])
            ->where('experiences.data.0.photos', []));
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
        $evidence = $experience->photos->last();
        $fake = Storage::disk('public');
        $manager = Storage::getFacadeRoot();
        $broken = Mockery::mock(FilesystemAdapter::class);
        $broken->shouldReceive('delete')->andReturn(false);
        Storage::shouldReceive('disk')->with('public')->andReturn($broken);

        $this->assertSame(['deleted' => 0, 'failed' => 2], app(ImageUploads::class)->deleteContributionImages($experience));
        $this->assertSame([], $experience->refresh()->photos->modelKeys());
        $this->assertTrue($evidence->refresh()->pending_deletion);
        // Only the reported experience is affected; the method above it keeps its photo.
        $this->assertFalse($method->photos()->firstOrFail()->pending_deletion);

        Storage::swap($manager);
        $this->artisan('media:prune')->assertSuccessful();
        $fake->assertMissing($evidence->path);
        $this->assertDatabaseCount('media_images', 1);
    }
}
