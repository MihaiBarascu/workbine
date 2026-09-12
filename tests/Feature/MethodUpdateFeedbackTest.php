<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\MethodUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Support\SessionKey;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MethodUpdateFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public static function rejectedDrafts(): array
    {
        return [
            'changed note' => ['A changed draft that has not been published.', 'submission_id'],
            'invalid note' => ['', 'body'],
        ];
    }

    #[DataProvider('rejectedDrafts')]
    public function test_rejected_retry_does_not_replay_the_unconsumed_success(string $draft, string $field): void
    {
        $method = Method::factory()->create(['protected_at' => now()]);
        $originalMethod = $method->refresh()->getAttributes();
        $params = [$method->topic, $method];
        $editorUrl = route('methods.edit', $params);
        $url = route('methods.updates.store', $params);
        $submissionId = (string) Str::uuid();
        $cookie = config('session.cookie');

        $saved = $this->actingAs($method->user)
            ->withSession([SessionKey::FLASH_DATA => ['hint' => 'Keep unrelated feedback.']])
            ->from($editorUrl)
            ->post($url, [
                'submission_id' => $submissionId,
                'body' => 'The original note was saved before its response was lost.',
            ])
            ->assertRedirect(route('topics.show', $method->topic).'#method-'.$method->id)
            ->assertInertiaFlash('toast.message', 'Update added.')
            ->assertCookie($cookie);
        $update = MethodUpdate::query()->firstOrFail();
        $originalUpdate = $update->getAttributes();

        // No destination GET: the browser lost the success response. Retain the
        // same session, including its unconsumed flash, for the real retry.
        $retry = $this->withCookie($cookie, $saved->getCookie($cookie)->getValue())
            ->from($editorUrl)
            ->post($url, ['submission_id' => $submissionId, 'body' => $draft])
            ->assertRedirect($editorUrl)
            ->assertSessionHasErrors($field)
            ->assertInertiaFlashMissing('toast')
            ->assertInertiaFlash('hint', 'Keep unrelated feedback.');

        if ($draft !== '') {
            $retry->assertSessionHasInput('body', $draft);
        }

        $this->assertDatabaseCount('method_updates', 1);
        $this->assertSame($originalUpdate, $update->refresh()->getAttributes());
        $this->assertSame($originalMethod, $method->refresh()->getAttributes());
    }
}
