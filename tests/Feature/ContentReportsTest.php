<?php

namespace Tests\Feature;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use App\Services\ImageUploads;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContentReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['community.reports_enabled' => true]);
    }

    private function experience(Method $method, ?User $user = null): Experience
    {
        return $method->experiences()->create([
            'user_id' => ($user ?? User::factory()->create())->id,
            'outcome' => 'partly', 'body' => 'A real trial with enough practical context to be useful.',
        ]);
    }

    private function report(Topic|Method|Experience $target, string $type): ContentReport
    {
        return ContentReport::query()->create([
            'user_id' => User::factory()->create()->id, 'target_type' => $type,
            'target_id' => $target->id, 'reason' => 'spam', 'details' => 'Private report context.',
        ]);
    }

    public function test_reports_require_authentication_and_explicit_enablement(): void
    {
        $topic = Topic::factory()->create();
        $url = route('reports.create', ['topic', $topic->id]);
        $this->get($url)->assertRedirect(route('login'));
        $this->post(route('reports.store', ['topic', $topic->id]), ['reason' => 'spam'])->assertRedirect(route('login'));
        config(['community.reports_enabled' => false]);
        $this->actingAs(User::factory()->create())->get($url)->assertNotFound();
        $this->post(route('reports.store', ['topic', $topic->id]), ['reason' => 'spam'])->assertNotFound();
        $this->assertDatabaseCount('content_reports', 0);
    }

    public function test_reports_accept_supported_targets_without_publicly_exposing_reports(): void
    {
        $method = Method::factory()->create();
        $experience = $this->experience($method);
        $user = User::factory()->create();
        foreach (['topic' => $method->topic, 'method' => $method, 'experience' => $experience] as $type => $target) {
            $this->actingAs($user)->get(route('reports.create', [$type, $target->id]))
                ->assertInertia(fn (Assert $page) => $page->component('reports/create')->where('target.id', $target->id));
            $this->post(route('reports.store', [$type, $target->id]), [
                'reason' => 'privacy', 'details' => 'Private report context.', 'user_id' => $method->user_id,
                'status' => 'hidden', 'target_type' => 'user',
            ])->assertSessionHasNoErrors()->assertRedirect();
            $this->assertDatabaseHas('content_reports', ['target_type' => $type, 'target_id' => $target->id, 'user_id' => $user->id, 'status' => 'open']);
        }
        $this->assertDatabaseCount('content_reports', 3);
        $this->get(route('topics.show', $method->topic))->assertDontSee('Private report context.');
        $this->get(route('experiences.index', [$method->topic, $method]))->assertDontSee('Private report context.');
        $this->get(route('members.show', $user->username))->assertDontSee('Private report context.');
    }

    public function test_retries_create_one_report_and_cannot_rewrite_it(): void
    {
        $topic = Topic::factory()->create();
        $this->actingAs(User::factory()->create());
        $url = route('reports.store', ['topic', $topic->id]);
        $this->post($url, ['reason' => 'spam'])->assertRedirect();
        $this->post($url, ['reason' => 'privacy'])->assertRedirect();
        $this->assertDatabaseCount('content_reports', 1);
        $this->assertDatabaseHas('content_reports', ['reason' => 'spam']);
    }

    public function test_validation_and_unknown_targets(): void
    {
        $topic = Topic::factory()->create();
        $this->actingAs(User::factory()->create());
        $url = route('reports.store', ['topic', $topic->id]);
        $this->post($url, ['reason' => 'other'])->assertSessionHasErrors('details');
        $this->post($url, ['reason' => 'invalid', 'details' => str_repeat('a', 2001)])->assertSessionHasErrors(['reason', 'details']);
        $this->post(route('reports.store', ['topic', 999999]), ['reason' => 'spam'])->assertNotFound();
        $this->post('/reports/user/1', ['reason' => 'spam'])->assertNotFound();
        $this->get('/reports/topic/9999999999999999999999/create')->assertNotFound();
        $this->assertDatabaseCount('content_reports', 0);
    }

    public function test_rate_limit_bounds_submission_volume(): void
    {
        $topic = Topic::factory()->create();
        $this->actingAs(User::factory()->create());
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('reports.store', ['topic', $topic->id]), ['reason' => 'spam'])->assertRedirect();
        }
        $this->post(route('reports.store', ['topic', $topic->id]), ['reason' => 'spam'])->assertStatus(429);
    }

    public function test_hiding_topic_hides_descendants_from_routes_discovery_and_profiles_without_deleting_them(): void
    {
        $method = Method::factory()->create();
        $topic = $method->topic;
        $experience = $this->experience($method);
        $report = $this->report($topic, 'topic');
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'hide', '--note' => 'Spam content reviewed.'])->assertSuccessful();
        $this->get(route('topics.show', $topic))->assertNotFound();
        $this->get(route('experiences.index', [$topic, $method]))->assertNotFound();
        $this->get(route('topics.index'))->assertInertia(fn (Assert $page) => $page->has('topics.data', 0));
        foreach ([$topic->user, $method->user, $experience->user] as $user) {
            foreach (['topics', 'methods', 'experiences'] as $view) {
                $this->get(route('members.show', ['username' => $user->username, 'view' => $view]))
                    ->assertInertia(fn (Assert $page) => $page->has('contributions.data', 0));
            }
        }
        $this->assertDatabaseCount('topics', 1);
        $this->assertDatabaseCount('methods', 1);
        $this->assertDatabaseCount('experiences', 1);
        $this->artisan('content:restore', ['type' => 'topic', 'id' => $topic->id])->assertSuccessful();
        $this->get(route('experiences.index', [$topic, $method]))->assertOk();
    }

    public function test_hiding_method_preserves_topic_and_history_and_blocks_mutations(): void
    {
        $method = Method::factory()->create();
        $this->experience($method);
        $report = $this->report($method, 'method');
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'hide', '--note' => 'Reviewed unsafe instructions.'])->assertSuccessful();
        $this->get(route('topics.show', $method->topic))->assertInertia(fn (Assert $page) => $page->has('methods', 0)->where('topic.methods_count', 0));
        $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]))->assertNotFound();
        $this->put(route('experiences.store', [$method->topic, $method]), ['outcome' => 'worked', 'body' => 'A trial with enough practical context.'])->assertNotFound();
        $this->assertDatabaseCount('experiences', 1);
    }

    public function test_hidden_experience_cannot_be_republished_but_can_be_removed_by_owner(): void
    {
        $method = Method::factory()->create();
        $experience = $this->experience($method);
        $report = $this->report($experience, 'experience');
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'hide', '--note' => 'Reviewed harassment.'])->assertSuccessful();
        $this->actingAs($experience->user)->get(route('experiences.index', [$method->topic, $method]))
            ->assertInertia(fn (Assert $page) => $page->has('experiences.data', 0)->where('ownExperience', null)->where('ownExperienceHidden', true)->where('summary.partly', 0));
        $this->put(route('experiences.store', [$method->topic, $method]), ['outcome' => 'worked', 'body' => 'Trying to replace a hidden experience with another.'])->assertForbidden();
        $this->assertDatabaseCount('experiences', 1);
        $this->delete(route('experiences.destroy', [$method->topic, $method]))->assertRedirect();
        $this->assertDatabaseCount('experiences', 0);
    }

    public function test_hidden_evidence_is_not_pruned_and_account_deletion_still_cleans_it_up(): void
    {
        Storage::fake('public');
        $method = Method::factory()->create();
        $experience = $this->experience($method);
        $image = MediaImage::query()->create(['user_id' => $experience->user_id, 'disk' => 'public', 'path' => 'images/test.webp', 'bytes' => 10, 'width' => 2, 'height' => 2]);
        $image->forceFill(['created_at' => now()->subHours(2)])->save();
        Storage::disk('public')->put($image->path, 'test-image');
        $experience->forceFill(['evidence_image_id' => $image->id, 'hidden_at' => now()])->save();
        $method->topic->forceFill(['hidden_at' => now()])->save();
        $uploads = app(ImageUploads::class);
        $this->assertSame(['deleted' => 0, 'failed' => 0], $uploads->prune());
        Storage::disk('public')->assertExists($image->path);
        $uploads->deleteAccount($method->topic->user);
        $this->assertDatabaseCount('media_images', 0);
        Storage::disk('public')->assertMissing($image->path);
    }

    public function test_review_requires_valid_action_and_note_and_dismissal_keeps_content_visible(): void
    {
        $topic = Topic::factory()->create();
        $report = $this->report($topic, 'topic');
        $this->artisan('reports:review')->assertSuccessful();
        $this->artisan('reports:review', ['id' => $report->id])->expectsOutputToContain('Private report context.')->assertSuccessful();
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'hide'])->assertFailed();
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'delete', '--note' => 'No deletion supported.'])->assertFailed();
        $this->artisan('reports:review', ['id' => $report->id, '--action' => 'dismiss', '--note' => 'No guideline violation.'])->assertSuccessful();
        $this->assertDatabaseHas('content_reports', ['id' => $report->id, 'status' => 'dismissed']);
        $this->get(route('topics.show', $topic))->assertOk();
    }

    public function test_restore_rejects_malformed_identifiers_without_restoring_other_content(): void
    {
        $topic = Topic::factory()->create();
        $topic->forceFill(['hidden_at' => now()])->save();

        foreach ([$topic->id.'oops', '0', '-1', '9999999999999999999999'] as $id) {
            $this->artisan('content:restore', ['type' => 'topic', 'id' => $id])->assertFailed();
        }

        $this->assertNotNull(Topic::withoutGlobalScopes()->findOrFail($topic->id)->hidden_at);
    }

    public function test_review_rejects_malformed_identifiers_without_applying_a_decision(): void
    {
        $topic = Topic::factory()->create();
        $report = $this->report($topic, 'topic');

        $this->artisan('reports:review', [
            'id' => $report->id.'oops', '--action' => 'hide', '--note' => 'Must not apply this decision.',
        ])->assertFailed();

        $this->assertDatabaseHas('content_reports', ['id' => $report->id, 'status' => 'open']);
        $this->assertNull($topic->fresh()->hidden_at);
    }
}
