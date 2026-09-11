<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\User;
use App\Services\ImageUploads;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class ImageUploadsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['media.enabled' => true, 'media.disk' => 'public']);
        Storage::fake('public');
    }

    private function avatar(User $user): MediaImage
    {
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('profile.jpg', 900, 600)])
            ->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

        return $user->refresh()->avatarImage;
    }

    private function experiencePayload(array $overrides = []): array
    {
        return [...[
            '_method' => 'put',
            'outcome' => 'worked',
            'body' => 'I tried this approach for two weeks and the practical result was useful.',
        ], ...$overrides];
    }

    public function test_uploads_require_authentication_and_fail_closed_when_disabled_or_unconfigured(): void
    {
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('image.jpg')])->assertRedirect(route('login'));
        $this->delete(route('profile.avatar.destroy'))->assertRedirect(route('login'));
        $this->actingAs(User::factory()->create());
        config(['media.enabled' => false]);
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('image.jpg')])->assertSessionHasErrors('avatar');
        config(['media.enabled' => true, 'media.disk' => 'r2', 'filesystems.disks.r2.key' => '']);
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('image.jpg')])->assertSessionHasErrors('avatar');
        $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page->where('media.enabled', false));
        $this->assertDatabaseCount('media_images', 0);
    }

    public function test_avatar_is_reencoded_cropped_and_public_without_exposing_its_ledger(): void
    {
        $user = User::factory()->create(['avatar' => 'https://google.example/private-provider-image']);
        $image = $this->avatar($user);
        $this->assertSame(512, $image->width);
        $this->assertSame(512, $image->height);
        $this->assertStringEndsWith('.webp', $image->path);
        $this->assertStringNotContainsString('profile', $image->path);
        $contents = Storage::disk('public')->get($image->path);
        $this->assertSame(strlen($contents), $image->bytes);
        $this->assertSame('image/webp', getimagesizefromstring($contents)['mime']);
        $this->assertLessThanOrEqual(1048576, $image->bytes);
        $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.avatar_url', $image->url())->missing('auth.user.avatar_image')->missing('auth.user.avatarImage'));
        $this->get(route('members.show', $user->username))->assertInertia(fn (Assert $page) => $page
            ->where('member.avatar_url', $image->url())->missing('member.avatar')->missing('member.avatar_image_id')->missing('member.email'));
    }

    public function test_only_jpeg_png_and_webp_with_bounded_size_and_pixels_are_accepted(): void
    {
        $this->actingAs(User::factory()->create());
        foreach ([
            UploadedFile::fake()->createWithContent('script.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            UploadedFile::fake()->image('animation.gif'),
            UploadedFile::fake()->createWithContent('not-an-image.jpg', 'not an image'),
            UploadedFile::fake()->image('too-big.jpg')->size(5121),
        ] as $file) {
            $this->post(route('profile.avatar.store'), ['avatar' => $file])->assertSessionHasErrors('avatar');
        }
        config(['media.max_pixels' => 100]);
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('too-many-pixels.png', 11, 10)])
            ->assertSessionHasErrors('avatar');
        $this->assertDatabaseCount('media_images', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_a_standard_phone_photo_fits_the_pixel_budget_and_is_resized(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('phone.jpg', 4032, 3024)])
            ->assertSessionHasNoErrors();
        $image = MediaImage::query()->sole();
        $this->assertSame(512, $image->width);
        $this->assertSame(512, $image->height);
        $this->assertLessThanOrEqual(1048576, $image->bytes);
    }

    public function test_profile_replacement_and_removal_clean_old_objects_and_preserve_google_photo(): void
    {
        $user = User::factory()->create(['avatar' => 'https://google.example/photo']);
        $old = $this->avatar($user);
        $new = $this->avatar($user);
        $this->assertNotSame($old->path, $new->path);
        Storage::disk('public')->assertMissing($old->path);
        Storage::disk('public')->assertExists($new->path);
        $this->assertDatabaseCount('media_images', 1);
        config(['media.enabled' => false]);
        $this->delete(route('profile.avatar.destroy'))->assertRedirect(route('profile.edit'));
        $this->assertNull($user->refresh()->avatar_image_id);
        $this->assertSame('https://google.example/photo', $user->avatar);
        $this->assertNull($user->avatarUrl());
        Storage::disk('public')->assertMissing($new->path);
        $this->assertDatabaseCount('media_images', 0);
    }

    public function test_google_login_does_not_overwrite_a_custom_profile_photo(): void
    {
        $user = User::factory()->create(['google_id' => 'google-image-test']);
        $image = $this->avatar($user);
        $this->post(route('logout'));
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-image-test',
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => 'https://google.example/new-avatar',
            'email_verified' => true,
        ]));
        $this->get(route('google.callback'))->assertRedirect(route('home'));
        $this->assertSame($image->id, $user->refresh()->avatar_image_id);
        $this->assertSame($image->url(), $user->avatarUrl());
    }

    public function test_quota_counts_reserved_and_pending_bytes_before_any_object_write(): void
    {
        $user = User::factory()->create();
        MediaImage::query()->create([
            'user_id' => $user->id, 'disk' => 'public', 'path' => 'images/waiting.webp',
            'bytes' => 100, 'width' => 1, 'height' => 1, 'pending_deletion' => true,
        ]);
        config(['media.user_quota_bytes' => 100]);
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('image.png')])
            ->assertSessionHasErrors('avatar');
        $this->assertDatabaseCount('media_images', 1);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertNull($user->refresh()->avatar_image_id);
    }

    public function test_storage_failure_keeps_the_previous_photo_and_retains_retryable_cleanup(): void
    {
        $user = User::factory()->create();
        $old = $this->avatar($user);
        $fake = Storage::disk('public');
        $manager = Storage::getFacadeRoot();
        $broken = Mockery::mock(FilesystemAdapter::class);
        $broken->shouldReceive('url')->andReturnUsing(fn (string $path) => $fake->url($path));
        $broken->shouldReceive('put')->once()->andThrow(new RuntimeException('Provider failure'));
        $broken->shouldReceive('delete')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('public')->andReturn($broken);
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('replace.png')])->assertSessionHasErrors('avatar');
        $this->assertSame($old->id, $user->refresh()->avatar_image_id);
        $failed = MediaImage::query()->where('id', '!=', $old->id)->firstOrFail();
        $this->assertTrue($failed->pending_deletion);
        Storage::swap($manager);
        $this->artisan('media:prune')->assertSuccessful();
        $this->assertDatabaseCount('media_images', 1);
        $fake->assertExists($old->path);
    }

    public function test_database_failure_after_upload_deletes_only_the_new_object(): void
    {
        $user = User::factory()->create();
        $old = $this->avatar($user);
        Event::listen('eloquent.updating: '.User::class, function (User $saving): void {
            if ($saving->isDirty('avatar_image_id')) {
                throw new RuntimeException('Simulated database failure');
            }
        });
        $this->withoutExceptionHandling();
        try {
            $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('new.png')]);
            $this->fail('Expected the attachment transaction to fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated database failure', $exception->getMessage());
        }
        $this->assertSame($old->id, $user->refresh()->avatar_image_id);
        $this->assertDatabaseCount('media_images', 1);
        $this->assertSame([$old->path], Storage::disk('public')->allFiles());
    }

    public function test_failed_deletion_keeps_a_ledger_until_a_successful_retry(): void
    {
        $user = User::factory()->create();
        $image = $this->avatar($user);
        $fake = Storage::disk('public');
        $manager = Storage::getFacadeRoot();
        $broken = Mockery::mock(FilesystemAdapter::class);
        $broken->shouldReceive('url')->andReturnUsing(fn (string $path) => $fake->url($path));
        $broken->shouldReceive('delete')->andReturn(false);
        Storage::shouldReceive('disk')->with('public')->andReturn($broken);
        $this->delete(route('profile.avatar.destroy'))->assertRedirect();
        $this->assertNull($user->refresh()->avatar_image_id);
        $this->assertTrue($image->refresh()->pending_deletion);
        $this->artisan('media:prune')->assertFailed();
        Storage::swap($manager);
        $this->artisan('media:prune')->assertSuccessful();
        $fake->assertMissing($image->path);
        $this->assertDatabaseCount('media_images', 0);
    }

    public function test_experience_image_upload_preserves_ratio_then_survives_text_edits_and_can_be_removed(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $route = route('experiences.store', [$method->topic, $method]);
        $this->actingAs($user)->post($route, $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('evidence.png', 2000, 1000)]))
            ->assertSessionHasNoErrors()->assertRedirect();
        $experience = Experience::query()->firstOrFail();
        $image = $experience->evidenceImage;
        $this->assertSame(1600, $image->width);
        $this->assertSame(800, $image->height);
        $this->post($route, $this->experiencePayload(['body' => 'Here is my updated experience, keeping the same supporting photograph.']))->assertRedirect();
        $this->assertSame($image->id, $experience->refresh()->evidence_image_id);
        $this->get(route('experiences.index', [$method->topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('experiences.data.0.evidence_image', $image->publicData())
            ->missing('experiences.data.0.evidence_image.path')->missing('experiences.data.0.evidence_image.disk'));
        config(['media.enabled' => false]);
        $this->post($route, $this->experiencePayload(['remove_evidence_image' => true]))->assertRedirect();
        $this->assertNull($experience->refresh()->evidence_image_id);
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_experience_upload_authorization_precedes_storage_and_ignores_supplied_image_ids(): void
    {
        $method = Method::factory()->create();
        $route = route('experiences.store', [$method->topic, $method]);
        $this->actingAs($method->user)->post($route, $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('self.png')]))
            ->assertForbidden();
        $this->assertDatabaseCount('media_images', 0);
        $other = User::factory()->create();
        $image = $this->avatar($other);
        $this->actingAs(User::factory()->create())->post($route, $this->experiencePayload(['evidence_image_id' => $image->id]))->assertRedirect();
        $this->assertNull(Experience::query()->firstOrFail()->evidence_image_id);
    }

    public function test_deleting_an_experience_removes_only_its_own_evidence(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $avatar = $this->avatar($user);
        $this->post(route('experiences.store', [$method->topic, $method]), $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('evidence.jpg')]))->assertRedirect();
        $image = Experience::query()->firstOrFail()->evidenceImage;
        $this->delete(route('experiences.destroy', [$method->topic, $method]))->assertRedirect();
        Storage::disk('public')->assertMissing($image->path);
        Storage::disk('public')->assertExists($avatar->path);
        $this->assertDatabaseCount('media_images', 1);
    }

    public function test_account_deletion_cleans_avatar_and_cascaded_evidence_without_erasing_an_upload_reservation(): void
    {
        $owner = User::factory()->create();
        $avatar = $this->avatar($owner);
        $method = Method::factory()->create(['user_id' => $owner->id]);
        $other = User::factory()->create();
        $this->actingAs($other)->post(route('experiences.store', [$method->topic, $method]), $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('evidence.jpg')]))->assertRedirect();
        $evidence = Experience::query()->firstOrFail()->evidenceImage;
        $reservation = app(ImageUploads::class)->store($owner, UploadedFile::fake()->image('pending.jpg'), 'avatar');
        $this->actingAs($owner)->delete(route('profile.destroy'), ['password' => 'password'])->assertRedirect(route('home'));
        Storage::disk('public')->assertMissing($avatar->path);
        Storage::disk('public')->assertMissing($evidence->path);
        Storage::disk('public')->assertExists($reservation->path);
        $this->assertNull($reservation->refresh()->user_id);
        $this->assertDatabaseCount('media_images', 1);
        $this->travel(61)->minutes();
        $this->artisan('media:prune')->assertSuccessful();
        $this->assertDatabaseCount('media_images', 0);
        Storage::disk('public')->assertMissing($reservation->path);
    }

    public function test_pruning_after_direct_cascade_keeps_referenced_and_recent_reserved_images(): void
    {
        $method = Method::factory()->create();
        $user = User::factory()->create();
        $avatar = $this->avatar($user);
        $this->post(route('experiences.store', [$method->topic, $method]), $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('evidence.jpg')]))->assertRedirect();
        $evidence = Experience::query()->firstOrFail()->evidenceImage;
        $method->topic->delete();
        $this->travel(61)->minutes();
        $reservation = app(ImageUploads::class)->store($user, UploadedFile::fake()->image('pending.jpg'), 'avatar');
        $this->artisan('media:prune')->assertSuccessful();
        Storage::disk('public')->assertExists($avatar->path);
        Storage::disk('public')->assertExists($reservation->path);
        Storage::disk('public')->assertMissing($evidence->path);
    }

    public function test_upload_rate_limits_cover_avatar_and_evidence_without_limiting_text_updates(): void
    {
        config(['media.uploads_per_hour' => 1]);
        $user = User::factory()->create();
        $this->avatar($user);
        $method = Method::factory()->create();
        $route = route('experiences.store', [$method->topic, $method]);
        $this->post($route, $this->experiencePayload(['evidence_image' => UploadedFile::fake()->image('evidence.jpg')]))->assertStatus(429)->assertHeader('Retry-After');
        $this->post($route, $this->experiencePayload())->assertRedirect();
        $this->assertDatabaseCount('media_images', 1);
    }

    public function test_daily_global_limit_is_shared_between_members(): void
    {
        config(['media.global_uploads_per_day' => 1]);
        $this->avatar(User::factory()->create());
        $this->actingAs(User::factory()->create())->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('profile.jpg')])->assertStatus(429);
        $this->assertDatabaseCount('media_images', 1);
    }

    public function test_processing_capacity_returns_a_field_error_without_reserving_storage(): void
    {
        $lock = Cache::lock('media:image-processing', 120);
        $lock->get();
        try {
            $this->actingAs(User::factory()->create())->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('image.jpg')])
                ->assertSessionHasErrors('avatar');
        } finally {
            $lock->release();
        }
        $this->assertDatabaseCount('media_images', 0);
    }

    public function test_exif_orientation_is_applied_before_metadata_is_removed(): void
    {
        $photo = UploadedFile::fake()->image('phone.jpg', 800, 400);
        $original = file_get_contents($photo->getPathname());
        // Minimal little-endian TIFF with Orientation = 6 (90 degrees clockwise).
        $exif = hex2bin('45786966000049492a0008000000010012010300010000000600000000000000');
        $jpeg = substr($original, 0, 2)."\xff\xe1".pack('n', strlen($exif) + 2).$exif.substr($original, 2);
        $file = UploadedFile::fake()->createWithContent('phone.jpg', $jpeg);
        $this->assertSame(6, exif_read_data($file->getPathname())['Orientation']);
        $image = app(ImageUploads::class)->store(User::factory()->create(), $file, 'evidence_image');
        $this->assertSame(400, $image->width);
        $this->assertSame(800, $image->height);
        $contents = Storage::disk('public')->get($image->path);
        $this->assertStringNotContainsString('Exif', $contents);
        $this->assertStringNotContainsString('EXIF', $contents);
    }

    public function test_r2_readiness_rejects_bucket_paths_and_unsafe_public_urls_before_uploads_are_enabled(): void
    {
        config([
            'media.disk' => 'r2',
            'media.enabled' => false,
            'filesystems.disks.r2.key' => 'test-key',
            'filesystems.disks.r2.secret' => 'test-secret',
            'filesystems.disks.r2.bucket' => 'workbine-media',
            'filesystems.disks.r2.endpoint' => 'https://account.r2.cloudflarestorage.com',
            'filesystems.disks.r2.url' => 'https://media.example.com',
        ]);
        $this->assertTrue(ImageUploads::configured());
        $this->assertFalse(ImageUploads::enabled());
        config(['filesystems.disks.r2.endpoint' => 'https://account.r2.cloudflarestorage.com/workbine-media']);
        $this->assertFalse(ImageUploads::configured());
        config(['filesystems.disks.r2.endpoint' => 'https://account.r2.cloudflarestorage.com']);
        foreach (['http://media.example.com', 'https://username@media.example.com', 'https://media.example.com:8443', 'https://media.example.com/images', 'https://media.example.com?key=test', 'https://public-bucket.r2.dev'] as $url) {
            config(['filesystems.disks.r2.url' => $url]);
            $this->assertFalse(ImageUploads::configured());
        }
    }
}
