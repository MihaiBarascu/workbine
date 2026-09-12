<?php

namespace Tests\Feature;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\Method;
use App\Models\ModerationReview;
use App\Models\Topic;
use App\Models\User;
use App\Support\ContributionRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class ContentModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['moderation.enabled' => true, 'moderation.api_key' => 'test-only-key']);
        Http::preventStrayRequests();
    }

    private function provider(array $categories = [], int $status = 200): void
    {
        Http::fake(['api.openai.com/v1/moderations' => Http::response([
            'results' => [['flagged' => in_array(true, $categories, true), 'categories' => [
                ...array_fill_keys(config('moderation.review_categories'), false), ...$categories,
            ]]],
        ], $status)]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        config(['moderation.admin_user_ids' => [(string) $admin->id]]);

        return $admin;
    }

    private function held(User $user): ModerationReview
    {
        if (Http::recorded()->isEmpty()) {
            $this->provider(['sexual' => true]);
        }
        $this->actingAs($user)->post(route('topics.store'), ['title' => 'Synthetic flagged fixture', 'description' => 'Benign test content, not actual prohibited material.'])
            ->assertSessionHasErrors('title');

        return ModerationReview::query()->latest('id')->firstOrFail();
    }

    public function test_disabled_filter_does_not_call_provider(): void
    {
        config(['moderation.enabled' => false]);
        $this->actingAs(User::factory()->create())->post(route('topics.store'), ['title' => 'Useful practical topic'])->assertSessionHasNoErrors();
        Http::assertNothingSent();
    }

    public function test_allowed_topic_and_first_method_use_one_call_with_only_public_fields(): void
    {
        $this->provider(['self-harm' => true, 'self-harm/intent' => true, 'violence' => true]);
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('topics.store'), [
            'title' => 'Recovery support', 'description' => 'A health discussion.',
            'include_method' => true, 'method_title' => 'Speak with a qualified professional',
            'method_body' => 'A supportive experience about seeking help and recovering.',
        ])->assertSessionHasNoErrors();
        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.openai.com/v1/moderations'
            && $request['model'] === 'omni-moderation-latest'
            && str_contains($request['input'][0]['text'], 'qualified professional')
            && ! str_contains($request->body(), $user->email)
            && ! str_contains($request->body(), 'include_method'));
        $this->assertDatabaseCount('topics', 1);
        $this->assertDatabaseCount('methods', 1);
        $this->assertDatabaseCount('moderation_reviews', 0);
    }

    public function test_flagged_submission_is_private_encrypted_deduplicated_and_approved_for_exact_author_resubmission(): void
    {
        $user = User::factory()->create();
        $admin = $this->admin();
        $review = $this->held($user);
        $raw = DB::table('moderation_reviews')->value('payload');
        $this->assertStringNotContainsString('Synthetic flagged fixture', $raw);
        $this->assertSame('Synthetic flagged fixture', $review->payload['text']['title']);
        $this->assertDatabaseCount('topics', 0);
        $this->held($user);
        $this->assertDatabaseCount('moderation_reviews', 1);
        Http::assertSentCount(1);
        $this->actingAs($admin)->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'approve', 'note' => 'False positive confirmed by human review.', 'publishing' => 'unchanged',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('topics', 0);
        $this->actingAs($user)->post(route('topics.store'), $review->payload['text'])->assertSessionHasNoErrors();
        Http::assertSentCount(1);
        $this->assertDatabaseCount('topics', 1);
        $this->post(route('topics.store'), [...$review->payload['text'], 'title' => 'Changed fixture'])
            ->assertSessionHasErrors('title');
        $this->actingAs(User::factory()->create())->post(route('topics.store'), $review->payload['text'])->assertSessionHasErrors('title');
        Http::assertSentCount(3);
    }

    public function test_flagged_updates_keep_old_public_content_and_revision_intact(): void
    {
        $this->provider(['hate/threatening' => true]);
        $user = User::factory()->create();
        $topic = Topic::factory()->for($user)->create();
        $method = Method::factory()->for($user)->for($topic)->create();
        $topicBefore = $topic->refresh()->getAttributes();
        $methodBefore = $method->refresh()->getAttributes();
        $this->actingAs($user)->patch(route('topics.update', $topic), [
            'title' => 'Changed fixture', 'description' => 'New description.', 'revision' => ContributionRevision::token($topic),
        ])->assertSessionHasErrors('title');
        $this->patch(route('methods.update', [$topic, $method]), [
            'title' => 'Changed method', 'body' => 'A different set of practical steps.', 'revision' => ContributionRevision::token($method),
        ])->assertSessionHasErrors('body');
        $this->assertSame($topicBefore, $topic->refresh()->getAttributes());
        $this->assertSame($methodBefore, $method->refresh()->getAttributes());
    }

    public function test_methods_experiences_and_profile_updates_are_checked_before_saving(): void
    {
        $this->provider(['illicit/violent' => true]);
        $user = User::factory()->create();
        $method = Method::factory()->create();
        $this->actingAs($user)->post(route('methods.store', $method->topic), ['title' => 'Another method', 'body' => 'Synthetic test with sufficient detail.'])->assertSessionHasErrors('body');
        $this->put(route('experiences.store', [$method->topic, $method]), ['outcome' => 'worked', 'body' => 'Synthetic test experience with sufficient detail.'])->assertSessionHasErrors('body');
        $this->patch(route('profile.update'), ['name' => 'Changed fixture', 'email' => $user->email, 'bio' => 'Test biography.'])->assertSessionHasErrors('name');
        $this->assertDatabaseCount('experiences', 0);
        $this->assertDatabaseCount('methods', 1);
        $this->assertNotSame('Changed fixture', $user->refresh()->name);
        $this->assertDatabaseCount('moderation_reviews', 3);
    }

    public function test_flagged_image_never_gets_a_public_object_and_requires_admin_for_preview(): void
    {
        $this->provider(['sexual' => true]);
        config(['media.enabled' => true, 'media.disk' => 'public']);
        Storage::fake('public');
        $user = User::factory()->create();
        $admin = $this->admin();
        $file = UploadedFile::fake()->image('benign.jpg');
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => $file])->assertSessionHasErrors('avatar');
        $review = ModerationReview::query()->firstOrFail();
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseCount('media_images', 0);
        $this->assertNull($user->refresh()->avatar_image_id);
        $this->get(route('moderation.image', $review->id))->assertForbidden();
        $this->actingAs($admin)->get(route('moderation.image', $review->id))->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->assertStringContainsString('no-store', $this->get(route('moderation.image', $review->id))->headers->get('Cache-Control'));
        $this->get(route('moderation.show', ['review', $review->id]))->assertInertia(fn (Assert $page) => $page
            ->where('item.image', route('moderation.image', $review->id, false))->missing('item.payload')->missing('item.fingerprint'));
        Http::assertSent(fn (Request $request) => str_starts_with($request['input'][0]['image_url']['url'], 'data:image/webp;base64,'));
        $this->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'approve', 'note' => 'Benign image approved.', 'publishing' => 'unchanged',
        ])->assertSessionHasNoErrors();
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => $file])->assertSessionHasNoErrors();
        Http::assertSentCount(1);
        $this->assertCount(1, Storage::disk('public')->allFiles());
        $this->assertNotNull($user->refresh()->avatar_image_id);

    }

    public function test_evidence_image_flag_leaves_old_experience_and_image_unchanged(): void
    {
        config(['media.enabled' => true, 'media.disk' => 'public']);
        Storage::fake('public');
        $user = User::factory()->create();
        $method = Method::factory()->create();
        $experience = $method->experiences()->create(['user_id' => $user->id, 'outcome' => 'worked', 'body' => 'Existing experience with useful practical detail.']);
        Http::fake(['api.openai.com/*' => function (Request $request) {
            $categories = array_fill_keys(config('moderation.review_categories'), false);
            $categories['sexual'] = $request['input'][0]['type'] === 'image_url';

            return Http::response(['results' => [['categories' => $categories]]]);
        }]);
        $before = $experience->refresh()->getAttributes();
        $this->actingAs($user)->post(route('experiences.store', [$experience->method->topic, $experience->method]), [
            '_method' => 'put', 'outcome' => 'worked', 'body' => 'Updated useful experience with enough detail.',
            'evidence_image' => UploadedFile::fake()->image('benign.png'),
        ])->assertSessionHasErrors('evidence_image');
        $this->assertSame($before, $experience->refresh()->getAttributes());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_provider_failures_create_private_manual_reviews_without_violation_categories(): void
    {
        $user = User::factory()->create();
        $admin = $this->admin();
        $this->actingAs($user);
        $responses = [Http::response([], 429), Http::response([], 500), Http::response(['results' => []]), Http::response(['results' => [['categories' => ['sexual' => 'false']]]]), Http::failedConnection()];
        foreach ($responses as $index => $response) {
            Http::swap(new Factory);
            Http::preventStrayRequests();
            Http::fake(['api.openai.com/*' => $response]);
            $this->post(route('topics.store'), ['title' => 'Retain this draft '.$index])->assertSessionHasErrors('title');
            $this->assertStringContainsString('Automatic checking is unavailable.', session('errors')->first('title'));
            $review = ModerationReview::query()->latest('id')->firstOrFail();
            $this->assertSame([], $review->categories);
            $this->assertSame('pending', $review->status);
        }
        config(['moderation.api_key' => '']);
        $data = ['title' => 'Draft during unavailable configuration'];
        $this->post(route('topics.store'), $data)->assertSessionHasErrors('title');
        $this->post(route('topics.store'), $data)->assertSessionHasErrors('title');
        $this->assertDatabaseCount('topics', 0);
        $this->assertDatabaseCount('moderation_reviews', 6);
        $review = ModerationReview::query()->latest('id')->firstOrFail();
        $this->assertStringNotContainsString($data['title'], DB::table('moderation_reviews')->where('id', $review->id)->value('payload'));
        $this->actingAs($admin)->get(route('moderation.show', ['review', $review->id]))
            ->assertInertia(fn (Assert $page) => $page->where('item.reasons.0', 'Automatic checking unavailable — manual review required. No violation has been determined.'));
        $this->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'approve', 'note' => 'Manually checked during provider outage.', 'publishing' => 'unchanged',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('topics', 0);
        $this->actingAs($user)->post(route('topics.store'), $data)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('topics', 1);
        $this->post(route('topics.store'), ['title' => 'Changed content still requires review'])->assertSessionHasErrors('title');
        $this->assertDatabaseCount('topics', 1);
    }

    public function test_outage_image_is_private_until_human_approval_and_resubmission(): void
    {
        $this->provider([], 503);
        config(['media.enabled' => true, 'media.disk' => 'public']);
        Storage::fake('public');
        $user = User::factory()->create();
        $admin = $this->admin();
        $file = UploadedFile::fake()->image('benign.jpg');
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => $file])->assertSessionHasErrors('avatar');
        $review = ModerationReview::query()->firstOrFail();
        $this->assertSame([], $review->categories);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseCount('media_images', 0);
        $this->get(route('moderation.image', $review->id))->assertForbidden();
        $this->actingAs($admin)->get(route('moderation.image', $review->id))->assertOk();
        $this->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'approve', 'note' => 'Benign image manually verified.', 'publishing' => 'unchanged',
        ])->assertSessionHasNoErrors();
        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => $file])->assertSessionHasNoErrors();
        Http::assertSentCount(1);
        $this->assertNotNull($user->refresh()->avatar_image_id);
    }

    public function test_outage_fallback_respects_capacity_local_throttles_and_guest_registration(): void
    {
        $this->provider([], 503);
        $user = User::factory()->create();
        config(['moderation.reviews_per_user' => 1]);
        $this->actingAs($user)->post(route('topics.store'), ['title' => 'First outage draft'])->assertSessionHasErrors('title');
        $this->post(route('topics.store'), ['title' => 'Second outage draft'])->assertSessionHasErrors('title');
        $this->assertDatabaseCount('moderation_reviews', 1);
        config(['moderation.reviews_per_user' => 20]);
        RateLimiter::increment('moderation:'.$user->id, 60, 30);
        $this->post(route('topics.store'), ['title' => 'Locally throttled draft'])->assertSessionHasErrors('title');
        $this->assertDatabaseCount('moderation_reviews', 1);
        Http::assertSentCount(2);
        RateLimiter::clear('moderation:'.$user->id);
        RateLimiter::increment('moderation:global', 60, 200);
        $this->post(route('topics.store'), ['title' => 'Globally throttled draft'])->assertSessionHasErrors('title');
        Http::assertSentCount(2);
        $this->assertDatabaseCount('moderation_reviews', 1);
        RateLimiter::clear('moderation:global');
        $this->app['auth']->forgetGuards();
        $this->post(route('register.store'), ['name' => 'New member', 'email' => 'outage@example.test', 'password' => 'password', 'password_confirmation' => 'password'])->assertSessionHasErrors('name');
        $this->assertDatabaseMissing('users', ['email' => 'outage@example.test']);
        $this->assertDatabaseCount('moderation_reviews', 1);
    }

    public function test_review_routes_are_denied_to_guests_members_and_unverified_admins(): void
    {
        $user = User::factory()->create();
        $review = $this->held($user);
        $this->get('/moderation')->assertForbidden();
        $this->get(route('moderation.show', ['review', $review->id]))->assertForbidden();
        $this->post(route('moderation.decide', ['review', $review->id]), ['action' => 'approve'])->assertForbidden();
        $user->forceFill(['email_verified_at' => null])->save();
        config(['moderation.admin_user_ids' => [(string) $user->id]]);
        $this->get('/moderation')->assertRedirect(route('verification.notice'));
        $this->app['auth']->forgetGuards();
        $this->get('/moderation')->assertRedirect(route('login'));
    }

    public function test_admin_can_reject_suspend_and_restore_publishing_without_blocking_reading_or_security_settings(): void
    {
        $user = User::factory()->create();
        $admin = $this->admin();
        $review = $this->held($user);
        $this->actingAs($admin)->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'reject', 'note' => 'Repeated abuse reviewed manually.', 'publishing' => 'suspend',
        ])->assertSessionHasNoErrors();
        config(['moderation.enabled' => false]);
        $this->actingAs($user->fresh())->post(route('topics.store'), ['title' => 'Another submission'])->assertSessionHasErrors('title');
        $this->get('/topics')->assertOk();
        $this->get(route('profile.edit'))->assertOk();
        $this->patch(route('profile.update'), ['name' => $user->name, 'email' => 'changed@example.test'])->assertSessionHasNoErrors();
        $this->assertNotNull($user->refresh()->publishing_suspended_at);
        $this->actingAs($admin)->post(route('moderation.decide', ['review', $review->id]), [
            'action' => 'reject', 'note' => 'Publishing access restored after review.', 'publishing' => 'restore',
        ])->assertSessionHasNoErrors();
        $this->assertNull($user->refresh()->publishing_suspended_at);
        $user->forceFill(['publishing_suspended_at' => now()])->save();
        $this->travel(31)->days();
        $this->get('/moderation?kind=suspended')->assertInertia(fn (Assert $page) => $page->where('items.data.0.summary', '@'.$user->username));
        $this->post(route('moderation.restore-publishing', $user->id))->assertRedirect();
        $this->assertNull($user->refresh()->publishing_suspended_at);
        $this->actingAs(User::factory()->create())->post(route('moderation.restore-publishing', $admin->id))->assertForbidden();
    }

    public function test_report_hiding_and_restoration_preserve_descendants_and_private_reporter_details(): void
    {
        $admin = $this->admin();
        $method = Method::factory()->create();
        $experience = $method->experiences()->create(['user_id' => User::factory()->create()->id, 'outcome' => 'worked', 'body' => 'Existing experience with useful practical detail.']);
        $topic = $experience->method->topic;
        $report = ContentReport::query()->create(['user_id' => User::factory()->create()->id, 'target_type' => 'topic', 'target_id' => $topic->id, 'reason' => 'unsafe', 'details' => 'Private reporter context.']);
        $this->actingAs($admin)->get(route('moderation.show', ['report', $report->id]))->assertInertia(fn (Assert $page) => $page->where('item.details', 'Private reporter context.')->missing('item.user_id'));
        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'hide', 'note' => 'Confirmed violation.', 'publishing' => 'unchanged'])->assertSessionHasNoErrors();
        $this->assertNull(Experience::query()->find($experience->id));
        $this->assertNotNull(Experience::withoutGlobalScopes()->find($experience->id));
        $this->post(route('moderation.decide', ['report', $report->id]), ['action' => 'restore', 'note' => 'Restored after a second review.', 'publishing' => 'unchanged'])->assertSessionHasNoErrors();
        $this->assertNotNull(Experience::query()->find($experience->id));
    }

    public function test_signup_checks_public_name_and_google_falls_back_without_blocking_login(): void
    {
        $this->provider(['sexual' => true]);
        $this->post(route('register.store'), ['name' => 'Flagged fixture name', 'email' => 'signup@example.test', 'password' => 'password', 'password_confirmation' => 'password'])->assertSessionHasErrors('name');
        $this->assertDatabaseCount('users', 0);
        Socialite::fake('google', SocialiteUser::fake(['id' => 'test-google', 'name' => 'Flagged fixture name', 'email' => 'google@example.test', 'email_verified' => true]));
        $this->get(route('google.callback'))->assertRedirect(route('home'));
        $this->assertDatabaseHas('users', ['name' => 'Member', 'email' => 'google@example.test']);
        $this->assertDatabaseCount('moderation_reviews', 0);
        Http::assertSent(fn (Request $request) => ! str_contains($request->body(), '@example.test'));
    }

    public function test_private_review_retention_capacity_and_account_deletion(): void
    {
        $user = User::factory()->create();
        $review = $this->held($user);
        config(['moderation.reviews_per_user' => 1]);
        $this->post(route('topics.store'), ['title' => 'Another flagged fixture'])->assertSessionHasErrors('title');
        $this->assertDatabaseCount('moderation_reviews', 1);
        $this->travel(31)->days();
        $this->artisan('moderation:prune')->assertSuccessful();
        $this->assertDatabaseCount('moderation_reviews', 0);
        $this->held($user);
        $user->delete();
        $this->assertDatabaseCount('moderation_reviews', 0);
    }
}
