<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use App\Models\User;
use App\Services\ContentModeration;
use App\Services\ImageUploads;
use App\Services\Reputation;
use App\Support\ContributionRevision;
use App\Support\ExperienceRevision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class ExperienceRevisionTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Method $method, string $experienceRevision, array $overrides = []): array
    {
        return [...[
            'method_revision' => ContributionRevision::token($method),
            'experience_revision' => $experienceRevision,
            'outcome' => 'partly',
            'body' => 'I used this approach in a real project and recorded the practical result.',
        ], ...$overrides];
    }

    public function test_tokens_distinguish_absent_experiences_identity_and_every_editable_content_or_evidence_field(): void
    {
        $this->assertSame('new', ExperienceRevision::token(null));

        $method = Method::factory()->create();
        $member = User::factory()->create();
        $experience = $method->experiences()->create([
            'user_id' => $member->id,
            'outcome' => 'partly',
            'body' => 'The original account has useful practical detail.',
        ]);
        $original = ExperienceRevision::token($experience);
        $this->assertSame(64, strlen($original));

        foreach ([
            ['outcome' => 'worked'],
            ['body' => 'The revised account has different practical detail.'],
            ['body_document' => ['type' => 'doc', 'content' => []]],
            ['evidence_url' => 'https://example.com/revised-evidence'],
            ['tried_on' => '2025-02-03'],
            ['evidence_image_id' => MediaImage::query()->create([
                'user_id' => $experience->user_id,
                'disk' => 'public',
                'path' => 'images/test/revision-evidence.webp',
                'bytes' => 1,
                'width' => 1,
                'height' => 1,
            ])->id],
        ] as $changes) {
            $experience->forceFill($changes)->save();
            $changed = ExperienceRevision::token($experience->refresh());
            $this->assertNotSame($original, $changed);
            $original = $changed;
        }

        $attributes = $experience->only(['outcome', 'body', 'body_document', 'evidence_url', 'tried_on', 'evidence_image_id']);
        $rowToken = ExperienceRevision::token($experience);
        $experience->delete();
        $replacement = $method->experiences()->create(['user_id' => $member->id, ...$attributes]);
        $this->assertNotSame($rowToken, ExperienceRevision::token($replacement));
    }

    public function test_only_the_authenticated_members_experience_exposes_its_revision(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $other = User::factory()->create();
        $own = $method->experiences()->create(['user_id' => $member->id, 'outcome' => 'worked', 'body' => 'My practical account is visible to everyone.']);
        $method->experiences()->create(['user_id' => $other->id, 'outcome' => 'partly', 'body' => 'Another member shared a useful practical account.']);

        $this->actingAs($member)->get(route('methods.show', [$method->topic, $method]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('experiences.data', 2)
                ->where('ownExperience.revision', ExperienceRevision::token($own))
                ->missing('experiences.data.0.revision')
                ->missing('experiences.data.1.revision'));
    }

    public function test_missing_experience_revisions_are_rejected_as_json_for_updates_and_deletes(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $experience = $method->experiences()->create(['user_id' => $member->id, 'outcome' => 'worked', 'body' => 'The saved response must stay unchanged when validation fails.']);
        $before = $experience->refresh()->getAttributes();

        $this->actingAs($member)->putJson(route('experiences.store', [$method->topic, $method]), [
            'method_revision' => ContributionRevision::token($method),
            'outcome' => 'did_not_work',
            'body' => 'A request without its response revision cannot replace this response.',
        ])->assertUnprocessable()->assertJsonValidationErrors('experience_revision');

        $this->deleteJson(route('experiences.destroy', [$method->topic, $method]))
            ->assertUnprocessable()->assertJsonValidationErrors('experience_revision');

        $this->assertSame($before, $experience->refresh()->getAttributes());
    }

    public function test_stale_update_after_delete_and_stale_delete_after_edit_leave_the_latest_state_unchanged(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $params = [$method->topic, $method];

        $this->actingAs($member)->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $experience = Experience::query()->sole();
        $staleAfterDelete = ExperienceRevision::token($experience);
        $this->delete(route('experiences.destroy', $params), ['experience_revision' => $staleAfterDelete])->assertRedirect();
        $this->put(route('experiences.store', $params), $this->payload($method, $staleAfterDelete, ['outcome' => 'worked']))
            ->assertSessionHasErrors('experience_revision');
        $this->assertDatabaseCount('experiences', 0);

        $this->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $experience = Experience::query()->sole();
        $staleAfterEdit = ExperienceRevision::token($experience);
        $this->put(route('experiences.store', $params), $this->payload($method, $staleAfterEdit, ['outcome' => 'worked']))->assertRedirect();
        $latest = Experience::query()->sole();

        $this->delete(route('experiences.destroy', $params), ['experience_revision' => $staleAfterEdit])
            ->assertSessionHasErrors('experience_revision');
        $this->assertSame($latest->getAttributes(), $latest->refresh()->getAttributes());
        $this->assertSame('worked', $latest->outcome);
    }

    public function test_write_rechecks_the_response_after_preflight_before_mutating_under_the_locks(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $params = [$method->topic, $method];
        $this->actingAs($member)->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $experience = Experience::query()->sole();
        $stale = ExperienceRevision::token($experience);

        $moderation = Mockery::mock(ContentModeration::class);
        $moderation->shouldReceive('text')->once()->andReturnUsing(function () use ($experience): void {
            $experience->update(['body' => 'The response changed after the initial revision check.']);
        });
        $this->app->instance(ContentModeration::class, $moderation);

        $this->put(route('experiences.store', $params), $this->payload($method, $stale, ['outcome' => 'worked']))
            ->assertSessionHasErrors('experience_revision');
        $this->assertSame('The response changed after the initial revision check.', $experience->refresh()->body);
        $this->assertSame('partly', $experience->outcome);
    }

    public function test_two_new_submissions_cannot_overwrite_the_first_and_member_scope_is_preserved(): void
    {
        $method = Method::factory()->create();
        $firstMember = User::factory()->create();
        $secondMember = User::factory()->create();
        $params = [$method->topic, $method];

        $this->actingAs($firstMember)->put(route('experiences.store', $params), $this->payload($method, 'new', ['body' => 'The first saved response is the one that must remain.']))->assertRedirect();
        $first = Experience::query()->where('user_id', $firstMember->id)->sole();
        $this->put(route('experiences.store', $params), $this->payload($method, 'new', ['body' => 'A retry that expected no response must not overwrite the first.']))
            ->assertSessionHasErrors('experience_revision');
        $this->assertSame('The first saved response is the one that must remain.', $first->refresh()->body);

        $this->actingAs($secondMember)->put(route('experiences.store', $params), $this->payload($method, ExperienceRevision::token($first)))
            ->assertSessionHasErrors('experience_revision');
        $this->put(route('experiences.store', $params), $this->payload($method, 'new', ['outcome' => 'worked']))->assertRedirect();

        $this->assertDatabaseCount('experiences', 2);
        $this->assertSame('partly', $first->refresh()->outcome);
        $this->assertSame('worked', Experience::query()->where('user_id', $secondMember->id)->sole()->outcome);
    }

    public function test_same_second_edits_conflict_after_the_first_save_and_keep_the_correct_reputation(): void
    {
        $this->freezeTime();
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $params = [$method->topic, $method];

        $this->actingAs($member)->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $experience = Experience::query()->sole();
        $stale = ExperienceRevision::token($experience);
        $this->put(route('experiences.store', $params), $this->payload($method, $stale, ['outcome' => 'worked']))->assertRedirect();
        $this->put(route('experiences.store', $params), $this->payload($method, $stale, ['outcome' => 'did_not_work']))
            ->assertSessionHasErrors('experience_revision');

        $this->assertSame('worked', $experience->refresh()->outcome);
        $this->assertSame(5, app(Reputation::class)->forMember($method->user)['score']);
    }

    public function test_a_same_content_replacement_row_is_rejected_by_its_stale_identity_token(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $params = [$method->topic, $method];
        $this->actingAs($member)->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $original = Experience::query()->sole();
        $stale = ExperienceRevision::token($original);
        $attributes = $original->only(['outcome', 'body', 'body_document', 'evidence_url', 'tried_on', 'evidence_image_id']);
        $original->delete();
        $replacement = $method->experiences()->create(['user_id' => $member->id, ...$attributes]);

        $this->put(route('experiences.store', $params), $this->payload($method, $stale))->assertSessionHasErrors('experience_revision');
        $this->assertSame($attributes, $replacement->refresh()->only(array_keys($attributes)));
    }

    public function test_conflicting_image_and_rich_document_submissions_leave_existing_media_and_response_unchanged(): void
    {
        Storage::fake('public');
        config(['media.enabled' => true, 'media.disk' => 'public']);
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $params = [$method->topic, $method];
        $this->actingAs($member)->put(route('experiences.store', $params), $this->payload($method, 'new'))->assertRedirect();
        $experience = Experience::query()->sole();
        $stale = ExperienceRevision::token($experience);
        $draft = app(ImageUploads::class)->store($member, UploadedFile::fake()->image('draft.png'), 'editor');
        $beforeMedia = MediaImage::count();
        $beforeFiles = Storage::disk('public')->allFiles();
        $experience->update(['body' => 'The other writer saved this current version first.']);
        $document = json_encode(['type' => 'doc', 'content' => [[
            'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'A conflicting rich text response.']],
        ], [
            'type' => 'image', 'attrs' => ['imageId' => $draft->id],
        ]]], JSON_THROW_ON_ERROR);

        $this->put(route('experiences.store', $params), $this->payload($method, $stale, [
            'body_document' => $document,
            'evidence_image' => UploadedFile::fake()->image('replacement.png'),
        ]))->assertSessionHasErrors('experience_revision');

        $this->assertSame($beforeMedia, MediaImage::count());
        $this->assertSame($beforeFiles, Storage::disk('public')->allFiles());
        $this->assertNull($draft->refresh()->rich_experience_id);
        $this->assertSame('The other writer saved this current version first.', $experience->refresh()->body);
    }
}
