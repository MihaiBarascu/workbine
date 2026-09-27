<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ImageUploads;
use App\Support\ContributionRevision;
use App\Support\ExperienceRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PhotoGalleryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        config(['media.enabled' => true, 'media.disk' => 'public']);
    }

    private function upload(User $user, string $name = 'photo.png'): MediaImage
    {
        return MediaImage::query()->findOrFail($this->actingAs($user)->postJson(route('editor.images.store'), ['image' => UploadedFile::fake()->image($name)])->assertCreated()->json('id'));
    }

    /** @param list<array{0: MediaImage, 1?: string}> $photos */
    private function gallery(array $photos, string $field = 'photos'): array
    {
        return [
            "{$field}_present" => 1,
            $field => array_map(fn (array $photo): array => ['id' => $photo[0]->id, 'caption' => $photo[1] ?? null], $photos),
        ];
    }

    public function test_a_method_gallery_keeps_order_and_captions_and_releases_removed_photos(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->create();
        $first = $this->upload($author);
        $second = $this->upload($author);
        $this->post(route('methods.store', $topic), [
            'title' => 'My photos', 'body' => 'The steps I followed.',
            ...$this->gallery([[$second, 'Step 1: the finished result'], [$first]]),
        ])->assertSessionHasNoErrors();
        $method = $topic->methods()->firstOrFail();

        $this->get(route('methods.show', [$topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('method.photos', [[...$second->galleryData(), 'caption' => 'Step 1: the finished result'], $first->galleryData()])
            ->missing('method.photos.0.id'));
        $this->get(route('methods.edit', [$topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('method.photos.0.id', $second->id)->where('method.photos.1.id', $first->id));

        // A text edit from a form without the gallery leaves the photos alone.
        $this->patch(route('methods.update', [$topic, $method]), ['title' => 'My photos', 'body' => 'Clearer steps.', 'revision' => ContributionRevision::token($method)])
            ->assertSessionHasNoErrors();
        $this->assertSame([$second->id, $first->id], $method->photos()->pluck('id')->all());

        $revision = ContributionRevision::token($method->refresh());
        $this->patch(route('methods.update', [$topic, $method]), ['title' => 'My photos', 'body' => 'Clearer steps.', 'revision' => $revision, ...$this->gallery([[$first, 'Only this one']])])
            ->assertSessionHasNoErrors();
        $this->assertNotSame($revision, ContributionRevision::token($method->refresh()));
        $this->assertSame([[$first->id, 'Only this one']], $method->photos->map(fn (MediaImage $photo) => [$photo->id, $photo->caption])->all());
        $this->assertTrue($second->refresh()->pending_deletion);

        app(ImageUploads::class)->prune();
        Storage::disk('public')->assertMissing($second->path);
        Storage::disk('public')->assertExists($first->path);
    }

    public function test_only_the_authors_own_unattached_uploads_can_be_listed(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->create();
        $foreign = $this->upload(User::factory()->create());
        $this->actingAs($author)->post(route('methods.store', $topic), ['title' => 'Photos', 'body' => 'Some steps.', ...$this->gallery([[$foreign]])])
            ->assertSessionHasErrors('photos');

        $own = $this->upload($author);
        $this->post(route('methods.store', $topic), ['title' => 'Photos', 'body' => 'Some steps.', ...$this->gallery([[$own]])])->assertSessionHasNoErrors();
        $this->post(route('methods.store', $topic), ['title' => 'Photos again', 'body' => 'Some steps.', ...$this->gallery([[$own]])])
            ->assertSessionHasErrors('photos');
        $this->assertSame(1, $topic->methods()->count());
    }

    public function test_galleries_hold_six_photos_with_short_captions(): void
    {
        $author = User::factory()->create();
        $topic = Topic::factory()->create();
        $photos = array_map(fn (): array => [$this->upload($author)], range(1, 7));
        $this->post(route('methods.store', $topic), ['title' => 'Too many', 'body' => 'Some steps.', ...$this->gallery($photos)])->assertSessionHasErrors('photos');
        $this->post(route('methods.store', $topic), ['title' => 'Long caption', 'body' => 'Some steps.', ...$this->gallery([[$photos[0][0], str_repeat('a', 141)]])])
            ->assertSessionHasErrors('photos.0.caption');
        $this->assertSame(0, $topic->methods()->count());
    }

    public function test_a_new_topic_can_include_a_first_method_with_photos(): void
    {
        $author = User::factory()->create();
        $photo = $this->upload($author);
        $this->post(route('topics.store'), ['title' => 'A subject', 'include_method' => true, 'method_title' => 'My approach', 'method_body' => 'Some steps.', ...$this->gallery([[$photo, 'The result']], 'method_photos')])
            ->assertSessionHasNoErrors();
        $this->assertSame('The result', Method::query()->firstOrFail()->photos()->firstOrFail()->caption);

        $unused = $this->upload($author);
        $this->post(route('topics.store'), ['title' => 'Topic only', 'include_method' => false, ...$this->gallery([[$unused]], 'method_photos')])->assertSessionHasNoErrors();
        $this->assertNull($unused->refresh()->gallery_method_id);
    }

    public function test_an_experience_gallery_is_editable_by_its_author_and_leaves_with_the_response(): void
    {
        $member = User::factory()->create();
        $method = Method::factory()->create();
        $photo = $this->upload($member);
        $this->put(route('experiences.store', [$method->topic, $method]), [
            'method_revision' => ContributionRevision::token($method), 'experience_revision' => 'new', 'outcome' => 'worked', 'body' => 'It worked well for me.',
            ...$this->gallery([[$photo, 'My result']]),
        ])->assertSessionHasNoErrors();
        $experience = Experience::query()->firstOrFail();

        $this->get(route('methods.show', [$method->topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('experiences.data.0.photos', [[...$photo->galleryData(), 'caption' => 'My result']])
            ->missing('experiences.data.0.photos.0.id')
            ->where('ownExperience.photos.0.id', $photo->id));

        $this->delete(route('experiences.destroy', [$method->topic, $method]), ['experience_revision' => ExperienceRevision::token($experience)])->assertRedirect();
        // Removing the response removes its photos at once, not at the nightly cleanup.
        Storage::disk('public')->assertMissing($photo->path);
        $this->assertDatabaseMissing('media_images', ['id' => $photo->id]);
    }

    public function test_uploads_that_never_join_a_gallery_are_pruned_after_an_hour(): void
    {
        $member = User::factory()->create();
        $method = Method::factory()->create();
        $draft = $this->upload($member);
        $kept = $this->upload($member);
        $this->put(route('experiences.store', [$method->topic, $method]), [
            'method_revision' => ContributionRevision::token($method), 'experience_revision' => 'new', 'outcome' => 'partly', 'body' => 'Partly worked.',
            ...$this->gallery([[$kept]]),
        ])->assertSessionHasNoErrors();

        $this->travel(2)->hours();
        app(ImageUploads::class)->prune();

        Storage::disk('public')->assertMissing($draft->path);
        Storage::disk('public')->assertExists($kept->path);
    }

    public function test_pages_opened_before_galleries_are_asked_to_reload(): void
    {
        $member = User::factory()->create();
        $method = Method::factory()->create();
        $this->actingAs($member);
        $document = json_encode(['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'My steps.']]],
            ['type' => 'image', 'attrs' => ['imageId' => 1, 'alt' => 'Old photo']],
        ]], JSON_THROW_ON_ERROR);
        $response = $this->postJson(route('methods.store', $method->topic), ['title' => 'Old tab', 'body_document' => $document])->assertUnprocessable();
        $this->assertStringContainsString('Photos now go in the gallery', $response->json('errors.body.0'));

        $payload = ['method_revision' => ContributionRevision::token($method), 'experience_revision' => 'new', 'outcome' => 'worked', 'body' => 'It worked.'];
        $this->putJson(route('experiences.store', [$method->topic, $method]), [...$payload, 'remove_evidence_image' => '0'])
            ->assertUnprocessable()->assertJsonPath('errors.remove_evidence_image.0', 'This page is out of date. Copy your text, reload the page and add photos in the gallery.');
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_a_tried_method_keeps_its_original_photos(): void
    {
        $author = User::factory()->create();
        $method = Method::factory()->create(['user_id' => $author->id]);
        $photo = $this->upload($author);
        $method->forceFill(['protected_at' => now()])->save();
        $this->actingAs($author)->patch(route('methods.update', [$method->topic, $method]), [
            'title' => $method->title, 'body' => $method->body, 'revision' => ContributionRevision::token($method), ...$this->gallery([[$photo]]),
        ])->assertSessionHasErrors('revision');
        $this->assertNull($photo->refresh()->gallery_method_id);
    }
}
