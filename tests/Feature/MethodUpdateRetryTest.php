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

    public function test_identical_retries_confirm_the_existing_note_without_changing_it(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $originalMethod = $method->refresh()->getAttributes();
        $submissionId = (string) Str::uuid();
        $body = 'I now check the first step before continuing.';
        $url = route('methods.updates.store', [$method->topic, $method]);
        $returnUrl = route('topics.show', $method->topic).'#method-'.$method->id;

        $this->actingAs($method->user)
            ->post($url, ['submission_id' => $submissionId, 'body' => $body])
            ->assertRedirect($returnUrl)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Update added.');

        $update = MethodUpdate::query()->firstOrFail();
        $originalUpdate = $update->getAttributes();

        $this->travel(1)->minutes();

        // Request normalization must not turn harmless surrounding whitespace
        // into a conflicting draft, nor change the date of the published note.
        $this->post($url, [
            'submission_id' => $submissionId,
            'body' => " \n".$body."\n ",
        ])
            ->assertRedirect($returnUrl)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'This update was already published.');

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($originalUpdate, $update->refresh()->getAttributes());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());
    }

    public function test_conflicting_retry_keeps_the_draft_and_requires_a_new_submission_id(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $originalMethod = $method->refresh()->getAttributes();
        $submissionId = (string) Str::uuid();
        $update = MethodUpdate::query()->create([
            'method_id' => $method->id,
            'submission_id' => $submissionId,
            'body' => 'The earlier note that was already published.',
        ]);
        $originalUpdate = $update->refresh()->getAttributes();
        $draft = 'A revised note that must not be silently discarded.';
        $params = [$method->topic, $method];
        $editUrl = route('methods.edit', $params);
        $url = route('methods.updates.store', $params);
        $message = 'An earlier version of this update was already published. Your current text has not been published. You can use this draft for a new update.';
        $sessionCookie = config('session.cookie');

        $response = $this->actingAs($method->user)->from($editUrl)
            ->post($url, ['submission_id' => $submissionId, 'body' => $draft])
            ->assertRedirect($editUrl)
            ->assertSessionHasErrors(['submission_id' => $message])
            ->assertSessionHasInput('body', $draft)
            ->assertInertiaFlashMissing('toast')
            ->assertCookie($sessionCookie);

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($originalUpdate, $update->refresh()->getAttributes());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());

        // Carry the response cookie into the redirected GET, like a browser.
        // Separate feature requests do not maintain a browser cookie jar.
        $editor = $this->withCookie($sessionCookie, $response->getCookie($sessionCookie)->getValue())
            ->get($editUrl)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('topics/method-edit')
                ->where('errors.submission_id', $message)
                ->where('submissionId', fn ($value) => is_string($value) && Str::isUuid($value)));
        $newSubmissionId = $editor->inertiaProps('submissionId');
        $this->assertNotSame($submissionId, $newSubmissionId);

        // Only an explicit new submission may publish the changed text.
        $this->post($url, ['submission_id' => $newSubmissionId, 'body' => $draft])
            ->assertRedirect(route('topics.show', $method->topic).'#method-'.$method->id)
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Update added.');

        $this->assertDatabaseCount('method_updates', 2);
        $this->assertDatabaseHas('method_updates', [
            'method_id' => $method->id,
            'submission_id' => $newSubmissionId,
            'body' => $draft,
        ]);
        $this->assertSame($originalUpdate, $update->refresh()->getAttributes());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());
    }

    public function test_json_conflicting_retry_returns_validation_errors_instead_of_success(): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $originalMethod = $method->refresh()->getAttributes();
        $submissionId = (string) Str::uuid();
        $update = MethodUpdate::query()->create([
            'method_id' => $method->id,
            'submission_id' => $submissionId,
            'body' => 'An immutable published update.',
        ]);
        $original = $update->refresh()->getAttributes();

        $this->actingAs($method->user)
            ->postJson(route('methods.updates.store', [$method->topic, $method]), [
                'submission_id' => $submissionId,
                'body' => 'Different text must not be silently discarded.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('submission_id')
            ->assertJsonPath('errors.submission_id.0', 'An earlier version of this update was already published. Your current text has not been published. You can use this draft for a new update.');

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($original, $update->refresh()->getAttributes());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());
    }

    public function test_submission_id_reuse_on_another_method_does_not_create_a_false_conflict(): void
    {
        $first = Method::factory()->create(['protected_at' => now()]);
        $second = Method::factory()->for($first->user)->create(['protected_at' => now()]);
        $submissionId = (string) Str::uuid();
        $existing = MethodUpdate::query()->create([
            'method_id' => $first->id,
            'submission_id' => $submissionId,
            'body' => 'An update belonging to the first method.',
        ]);
        $originalUpdate = $existing->refresh()->getAttributes();
        $body = 'Different context for a different method.';

        $this->actingAs($first->user)
            ->post(route('methods.updates.store', [$second->topic, $second]), [
                'submission_id' => $submissionId,
                'body' => $body,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast.message', 'Update added.');

        $this->assertDatabaseCount('method_updates', 2);
        $this->assertDatabaseHas('method_updates', [
            'method_id' => $second->id,
            'submission_id' => $submissionId,
            'body' => $body,
        ]);
        $this->assertSame($originalUpdate, $existing->refresh()->getAttributes());
    }
}
