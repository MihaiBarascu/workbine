<?php

namespace Tests\Feature;

use App\Models\MediaImage;
use App\Models\Method;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhotoGalleryMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function image(User $user, array $attributes = []): MediaImage
    {
        return MediaImage::query()->create([
            'user_id' => $user->id, 'disk' => 'public', 'path' => 'images/'.fake()->uuid().'.webp',
            'bytes' => 10, 'width' => 2, 'height' => 2, 'rich_text' => true, ...$attributes,
        ]);
    }

    private function convert(): void
    {
        (require database_path('migrations/2026_09_27_120100_move_contribution_photos_into_galleries.php'))->up();
    }

    public function test_photos_move_out_of_documents_into_galleries_without_losing_text(): void
    {
        $method = Method::factory()->create();
        $author = $method->user;
        $short = $this->image($author, ['rich_method_id' => $method->id]);
        $long = $this->image($author, ['rich_method_id' => $method->id]);
        $inList = $this->image($author, ['rich_method_id' => $method->id]);
        $undocumented = $this->image($author, ['rich_method_id' => $method->id]);
        $longAlt = trim(str_repeat('A long description. ', 10));
        $document = ['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'My steps.', 'marks' => [['type' => 'italic']]]]],
            ['type' => 'image', 'attrs' => ['imageId' => $short->id, 'src' => 'https://media.example/a.webp', 'alt' => 'Short caption']],
            ['type' => 'image', 'attrs' => ['imageId' => $long->id, 'alt' => $longAlt]],
            ['type' => 'orderedList', 'attrs' => ['start' => 3], 'content' => [
                ['type' => 'listItem', 'content' => [
                    ['type' => 'image', 'attrs' => ['imageId' => $inList->id, 'alt' => '']],
                    ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Nested step']]]]]]],
                ]],
            ]],
            ['type' => 'image', 'attrs' => ['imageId' => $short->id, 'alt' => 'Another view']],
            ['type' => 'image', 'attrs' => ['imageId' => 999999, 'alt' => 'Not attached here']],
        ]];
        DB::table('methods')->where('id', $method->id)->update(['body_document' => json_encode($document), 'updated_at' => '2026-09-01 10:00:00']);

        $this->convert();

        $method->refresh();
        $this->assertSame(
            [[$short->id, 'Short caption'], [$long->id, null], [$inList->id, null], [$undocumented->id, null]],
            $method->photos->map(fn (MediaImage $photo) => [$photo->id, $photo->caption])->all(),
        );
        $this->assertSame(0, MediaImage::query()->whereNotNull('rich_method_id')->count());
        $this->assertStringNotContainsString('"image"', json_encode($method->body_document));
        $this->assertSame([['type' => 'italic']], $method->body_document['content'][0]['content'][0]['marks']);
        $this->assertSame($longAlt, $method->body_document['content'][1]['content'][0]['text']);
        $this->assertSame(3, $method->body_document['content'][2]['attrs']['start']);
        // The editor needs each list item to start with a paragraph.
        $this->assertSame(['paragraph', 'bulletList'], array_column($method->body_document['content'][2]['content'][0]['content'], 'type'));
        $this->assertStringContainsString('Another view', $method->body);
        $this->assertStringContainsString('Not attached here', $method->body);
        $this->assertStringNotContainsString('Short caption', $method->body);
        $this->assertSame('2026-09-01 10:00:00', $method->getRawOriginal('updated_at'));
    }

    public function test_the_evidence_photo_joins_the_experience_gallery_after_its_inline_photos(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        $experience = $method->experiences()->create(['user_id' => $member->id, 'outcome' => 'worked', 'body' => 'Photo and evidence.']);
        $inline = $this->image($member, ['rich_experience_id' => $experience->id]);
        $evidence = $this->image($member, ['rich_text' => false]);
        DB::table('experiences')->where('id', $experience->id)->update([
            'evidence_image_id' => $evidence->id,
            'body_document' => json_encode(['type' => 'doc', 'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Photo and evidence.']]],
                ['type' => 'image', 'attrs' => ['imageId' => $inline->id, 'alt' => 'During the trial']],
            ]]),
        ]);

        $this->convert();
        $before = DB::table('media_images')->orderBy('id')->get()->toArray();
        $this->convert();

        $experience->refresh();
        $this->assertNull($experience->evidence_image_id);
        $this->assertSame([[$inline->id, 'During the trial'], [$evidence->id, null]], $experience->photos->map(fn (MediaImage $photo) => [$photo->id, $photo->caption])->all());
        $this->assertTrue($evidence->refresh()->rich_text);
        $this->assertSame('Photo and evidence.', $experience->body);
        $this->assertEquals($before, DB::table('media_images')->orderBy('id')->get()->toArray());
    }
}
