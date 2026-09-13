<?php

namespace Tests\Feature;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\Method;
use App\Models\MethodUpdate;
use App\Models\Topic;
use App\Models\User;
use App\Services\Reputation;
use App\Support\ContributionRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MethodPreservationTest extends TestCase
{
    use RefreshDatabase;

    private function experiencePayload(array $overrides = []): array
    {
        return array_merge([
            'outcome' => 'worked',
            'body' => 'I tried this approach in a real project and the result held up.',
        ], $overrides);
    }

    private function requestPayload(Method $method, array $overrides = []): array
    {
        return $this->experiencePayload(array_merge([
            'method_revision' => ContributionRevision::token($method),
        ], $overrides));
    }

    private function updatePayload(string $submissionId, array $overrides = []): array
    {
        return array_merge([
            'submission_id' => $submissionId,
            'body' => 'A dated note preserving the original method while adding context.',
        ], $overrides);
    }

    public function test_first_other_member_experience_freezes_a_method_permanently(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $params = [$method->topic, $method];

        $this->actingAs($supporter)
            ->put(route('experiences.store', $params), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();

        $protectedAt = $method->refresh()->protected_at;
        $this->assertNotNull($protectedAt);

        $this->delete(route('experiences.destroy', $params))->assertRedirect();
        $this->assertNotNull($method->refresh()->protected_at);

        $replacement = User::factory()->create();
        $this->actingAs($replacement)
            ->put(route('experiences.store', $params), $this->requestPayload($method, ['outcome' => 'partly']))
            ->assertSessionHasNoErrors()->assertRedirect();
        $experience = Experience::query()->where('user_id', $replacement->id)->firstOrFail();
        $experience->forceFill(['hidden_at' => now()])->save();

        $this->assertNotNull($method->refresh()->protected_at);

        $replacement->delete();
        $this->assertDatabaseMissing('users', ['id' => $replacement->id]);

        $this->assertNotNull(Method::withoutGlobalScopes()->findOrFail($method->id)->protected_at);
    }

    public function test_stale_method_revision_rejects_an_experience_without_freezing_or_creating_it(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $revision = ContributionRevision::token($method);
        $method->update(['title' => 'Changed while the result was being written']);

        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method, [
                'method_revision' => $revision,
            ]))
            ->assertSessionHasErrors('method_revision');

        $this->assertDatabaseCount('experiences', 0);
        $this->assertNull($method->refresh()->protected_at);
    }

    public function test_protected_method_editor_exposes_state_and_rejects_original_patch(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();

        $original = $method->refresh()->getAttributes();
        $response = $this->actingAs($method->user)->get(route('methods.edit', [$method->topic, $method]));
        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('topics/method-edit')
            ->where('method.protected_at', fn ($value) => is_string($value) && $value !== '')
            ->where('revision', fn ($value) => is_string($value) && strlen($value) === 64));

        $this->actingAs($method->user)
            ->patch(route('methods.update', [$method->topic, $method]), [
                'title' => 'An attempted rewrite after evidence',
                'body' => 'The original method must remain available.',
                'source_url' => 'https://example.com/rewrite',
                'revision' => $response->inertiaProps('revision'),
            ])
            ->assertSessionHasErrors('revision');

        $this->assertSame($original, $method->refresh()->getAttributes());
    }

    public function test_method_updates_are_scoped_append_only_and_idempotent_by_submission_id(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();
        $original = $method->refresh()->getAttributes();
        $submissionId = (string) Str::uuid();

        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$method->topic, $method]), $this->updatePayload($submissionId))
            ->assertRedirect();
        $update = MethodUpdate::query()->firstOrFail();
        $this->assertSame($method->id, $update->method_id);
        $this->assertSame($submissionId, $update->submission_id);

        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$method->topic, $method]), $this->updatePayload($submissionId, [
                'body' => 'A retry with a changed body must be idempotent.',
                'method_id' => 999999,
                'id' => 999999,
            ]))
            ->assertRedirect();

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($update->id, MethodUpdate::query()->firstOrFail()->id);
        $this->assertSame($update->body, MethodUpdate::query()->firstOrFail()->body);
        $this->assertSame($original['body'], $method->refresh()->body);
        $this->assertSame($original['source_url'], $method->refresh()->source_url);
        $this->assertSame($original['updated_at'], $method->refresh()->getRawOriginal('updated_at'));

        $this->get(route('topics.show', $method->topic))->assertInertia(fn (Assert $page) => $page
            ->where('methods.0.updates.0.id', $update->id)
            ->where('methods.0.updates.0.body', $update->body)
            ->missing('methods.0.updates.0.submission_id'));

        $method->topic->forceFill(['hidden_at' => now()])->save();
        $this->get(route('topics.show', $method->topic))->assertNotFound();
        $this->post(route('methods.updates.store', [$method->topic, $method]), $this->updatePayload((string) Str::uuid()))
            ->assertNotFound();
    }

    public function test_method_update_body_and_submission_id_are_validated(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$method->topic, $method]), $this->updatePayload((string) Str::uuid()))
            ->assertSessionHasErrors('body');
        $this->assertDatabaseCount('method_updates', 0);

        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();

        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();

        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$method->topic, $method]), [
                'body' => '',
                'submission_id' => 'not-a-uuid',
            ])
            ->assertSessionHasErrors(['body', 'submission_id']);
        $this->assertDatabaseCount('method_updates', 0);

        $this->post(route('methods.updates.store', [$method->topic, $method]), [
            'body' => str_repeat('x', 5001),
            'submission_id' => (string) Str::uuid(),
        ])->assertSessionHasErrors('body');
    }

    public function test_method_updates_require_verified_owner_and_correct_topic_scope(): void
    {
        $method = Method::factory()->create();
        $params = [$method->topic, $method];
        $payload = $this->updatePayload((string) Str::uuid());

        $this->post(route('methods.updates.store', $params), $payload)->assertRedirect(route('login'));

        $this->actingAs(User::factory()->create())
            ->post(route('methods.updates.store', $params), $payload)
            ->assertForbidden();

        $unverified = User::factory()->unverified()->create();
        $unverifiedMethod = Method::factory()->for($unverified)->for($method->topic)->create();
        $this->actingAs($unverified)
            ->post(route('methods.updates.store', [$method->topic, $unverifiedMethod]), $payload)
            ->assertRedirect(route('verification.notice'));

        $otherTopic = Topic::factory()->create();
        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$otherTopic, $method]), $payload)
            ->assertNotFound();
    }

    public function test_method_updates_do_not_change_reputation_but_response_changes_still_recalculate(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $params = [$method->topic, $method];
        $this->actingAs($supporter)
            ->put(route('experiences.store', $params), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();
        $reputation = app(Reputation::class);
        $before = $reputation->forMember($method->user);
        $updatedAt = $method->refresh()->updated_at?->toIso8601String();

        $this->actingAs($method->user)
            ->post(route('methods.updates.store', $params), $this->updatePayload((string) Str::uuid()))
            ->assertRedirect();
        $this->assertSame($before, $reputation->forMember($method->user));
        $this->assertSame($updatedAt, $method->refresh()->updated_at?->toIso8601String());

        $this->actingAs($supporter)
            ->put(route('experiences.store', $params), $this->requestPayload($method, ['outcome' => 'partly']))
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(2, $reputation->forMember($method->user)['score']);
    }

    public function test_reported_method_moderation_includes_dated_updates(): void
    {
        $method = Method::factory()->create();
        $supporter = User::factory()->create();
        $this->actingAs($supporter)
            ->put(route('experiences.store', [$method->topic, $method]), $this->requestPayload($method))
            ->assertSessionHasNoErrors()->assertRedirect();
        $body = 'A dated preservation note visible to moderators with the report.';
        $this->actingAs($method->user)
            ->post(route('methods.updates.store', [$method->topic, $method]), $this->updatePayload((string) Str::uuid(), ['body' => $body]))
            ->assertRedirect();

        $report = ContentReport::query()->create([
            'user_id' => User::factory()->create()->id,
            'target_type' => 'method',
            'target_id' => $method->id,
            'reason' => 'spam',
            'details' => 'Private report details.',
            'status' => 'open',
        ]);
        $admin = User::factory()->create();
        config(['moderation.admin_user_ids' => [(string) $admin->id]]);

        $this->actingAs($admin)->get(route('moderation.show', ['report', $report->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('item.text.dated_updates', fn ($value) => is_string($value) && str_contains($value, $body)));
    }

    public function test_preservation_migration_backfills_hidden_and_negative_other_member_experiences_only(): void
    {
        $method = Method::factory()->create();
        $hiddenMethod = Method::factory()->create();
        $selfOnlyMethod = Method::factory()->create();
        $other = User::factory()->create();

        $method->experiences()->create($this->experiencePayload([
            'user_id' => $method->user_id,
            'outcome' => 'worked',
        ]));
        $hiddenExperience = $hiddenMethod->experiences()->create($this->experiencePayload([
            'user_id' => $other->id,
            'outcome' => 'did_not_work',
        ]));
        $hiddenExperience->forceFill(['hidden_at' => now()])->save();
        $selfOnlyMethod->experiences()->create($this->experiencePayload([
            'user_id' => $selfOnlyMethod->user_id,
            'outcome' => 'did_not_work',
        ]));

        $migration = require database_path('migrations/2026_09_13_000001_preserve_tried_methods.php');
        $migration->down();
        $migration->up();

        $this->assertNull(Method::withoutGlobalScopes()->findOrFail($method->id)->protected_at);
        $this->assertNotNull(Method::withoutGlobalScopes()->findOrFail($hiddenMethod->id)->protected_at);
        $this->assertNull(Method::withoutGlobalScopes()->findOrFail($selfOnlyMethod->id)->protected_at);
        $this->assertDatabaseCount('method_updates', 0);
        $this->assertSame(0, app(Reputation::class)->forMember($hiddenMethod->user)['score']);
    }
}
