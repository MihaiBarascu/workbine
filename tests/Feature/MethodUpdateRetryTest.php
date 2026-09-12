<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\MethodUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MethodUpdateRetryTest extends TestCase
{
    use RefreshDatabase;

    private const CONFLICT_MESSAGE = 'An earlier version of this update was already published. Your current text has not been published. You can use this draft for a new update.';

    public function test_identical_retry_confirms_the_existing_update_without_changing_its_dates(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $params = [$method->topic, $method];
        $payload = ['submission_id' => (string) Str::uuid(), 'body' => 'The original dated clarification.'];
        $destination = route('topics.show', $method->topic).'#method-'.$method->id;

        $this->actingAs($method->user)
            ->post(route('methods.updates.store', $params), $payload)
            ->assertRedirect($destination)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Update added.');

        $original = MethodUpdate::query()->firstOrFail()->getAttributes();
        $this->get(route('topics.show', $method->topic))->assertOk();
        $this->travel(2)->minutes();

        $this->post(route('methods.updates.store', $params), $payload)
            ->assertRedirect($destination)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'This update was already published.');

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($original, MethodUpdate::query()->firstOrFail()->getAttributes());
    }

    public function test_conflicting_retry_keeps_the_draft_and_requires_a_new_key_to_publish_it(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $params = [$method->topic, $method];
        $submissionId = (string) Str::uuid();
        $update = MethodUpdate::query()->create([
            'method_id' => $method->id,
            'submission_id' => $submissionId,
            'body' => 'The already published note must remain unchanged.',
        ]);
        $original = $update->getAttributes();
        $draft = 'A revised draft which has not yet been published.';
        $editorUrl = route('methods.edit', $params);

        $this->actingAs($method->user)->from($editorUrl)
            ->post(route('methods.updates.store', $params), [
                'submission_id' => $submissionId,
                'body' => $draft,
            ])
            ->assertRedirect($editorUrl)
            ->assertSessionHasErrors(['submission_id' => self::CONFLICT_MESSAGE])
            ->assertSessionHasInput('body', $draft)
            ->assertInertiaFlashMissing('toast');

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($original, $update->refresh()->getAttributes());
        $this->assertDatabaseMissing('method_updates', ['body' => $draft]);

        $editor = $this->get($editorUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('topics/method-edit')
            ->where('errors.submission_id', self::CONFLICT_MESSAGE)
            ->where('submissionId', fn ($value) => is_string($value) && Str::isUuid($value) && $value !== $submissionId));

        $this->post(route('methods.updates.store', $params), [
            'submission_id' => $editor->inertiaProps('submissionId'),
            'body' => $draft,
        ])
            ->assertRedirect(route('topics.show', $method->topic).'#method-'.$method->id)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Update added.');

        $this->assertDatabaseCount('method_updates', 2);
        $this->assertSame($original, $update->refresh()->getAttributes());
        $this->assertDatabaseHas('method_updates', ['method_id' => $method->id, 'body' => $draft]);
    }

    public function test_json_conflicting_retry_returns_validation_errors_instead_of_success(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $submissionId = (string) Str::uuid();
        $update = MethodUpdate::query()->create([
            'method_id' => $method->id,
            'submission_id' => $submissionId,
            'body' => 'An immutable published update.',
        ]);
        $original = $update->getAttributes();

        $this->actingAs($method->user)
            ->postJson(route('methods.updates.store', [$method->topic, $method]), [
                'submission_id' => $submissionId,
                'body' => 'Different text must not be silently discarded.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('submission_id')
            ->assertJsonPath('errors.submission_id.0', self::CONFLICT_MESSAGE);

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($original, $update->refresh()->getAttributes());
    }
}
