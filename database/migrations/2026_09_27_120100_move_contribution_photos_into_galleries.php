<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Moves photos out of rich-text documents, and experiences' evidence photo, into the
 * contribution galleries. One-way; rerunning it only converts what is still legacy.
 * Query-builder writes keep contribution timestamps and include hidden content.
 */
return new class extends Migration
{
    private const CAPTION_LIMIT = 140;

    public function up(): void
    {
        foreach (['method' => 'methods', 'experience' => 'experiences'] as $kind => $table) {
            // Documents are inspected in PHP: a JSON column cannot be searched portably.
            $rows = DB::table($table)->select('id')
                ->where(fn ($query) => $query
                    ->whereNotNull('body_document')
                    ->orWhereIn('id', DB::table('media_images')->whereNotNull("rich_{$kind}_id")->select("rich_{$kind}_id"))
                    ->when($kind === 'experience', fn ($query) => $query->orWhereNotNull('evidence_image_id')))
                ->lazyById(200);

            foreach ($rows as $row) {
                DB::transaction(fn () => $this->convert($kind, $table, (int) $row->id));
            }
        }
    }

    public function down(): void
    {
        // Documents and evidence pointers are not rebuilt; restore a backup to go back.
    }

    private function convert(string $kind, string $table, int $id): void
    {
        $row = DB::table($table)->where('id', $id)->lockForUpdate()->first();
        $attached = DB::table('media_images')->where("rich_{$kind}_id", $id)
            ->orderBy('id')->lockForUpdate()->pluck('id')->map(fn ($imageId): int => (int) $imageId)->all();

        /** @var array<int, string|null> $photos image id => caption, in reading order */
        $photos = [];
        $update = [];
        $document = is_string($row->body_document) ? json_decode($row->body_document, true) : null;
        $removed = false;
        if (is_array($document)) {
            $document = $this->withoutImages($document, $attached, $photos, $removed);
        }
        if ($removed) {
            $update['body_document'] = json_encode($document, JSON_THROW_ON_ERROR);
            $update['body'] = trim($this->text($document));
        }
        // Attached photos missing from the document keep their upload order after it.
        foreach ($attached as $imageId) {
            $photos[$imageId] ??= null;
        }
        // The evidence photo used to be shown after the text, so it stays last.
        if ($kind === 'experience' && $row->evidence_image_id !== null) {
            $photos[(int) $row->evidence_image_id] ??= null;
            $update['evidence_image_id'] = null;
        }

        $position = 0;
        foreach ($photos as $imageId => $caption) {
            DB::table('media_images')->where('id', $imageId)->update([
                "gallery_{$kind}_id" => $id,
                "rich_{$kind}_id" => null,
                'rich_text' => true,
                'position' => $position++,
                'caption' => $caption,
            ]);
        }
        if ($update !== []) {
            DB::table($table)->where('id', $id)->update($update);
        }
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  array<int, int>  $attached
     * @param  array<int, string|null>  $photos
     * @return array<string, mixed>
     */
    private function withoutImages(array $node, array $attached, array &$photos, bool &$removed): array
    {
        if (! isset($node['content']) || ! is_array($node['content'])) {
            return $node;
        }

        $content = [];
        $removedHere = false;
        foreach ($node['content'] as $child) {
            if (! is_array($child) || ($child['type'] ?? null) !== 'image') {
                $content[] = is_array($child) ? $this->withoutImages($child, $attached, $photos, $removed) : $child;

                continue;
            }
            $removed = $removedHere = true;

            $imageId = is_numeric($child['attrs']['imageId'] ?? null) ? (int) $child['attrs']['imageId'] : null;
            $alt = trim((string) ($child['attrs']['alt'] ?? ''));
            $own = $imageId !== null && in_array($imageId, $attached, true);
            if ($own && ! array_key_exists($imageId, $photos)) {
                $photos[$imageId] = $alt === '' || mb_strlen($alt) > self::CAPTION_LIMIT ? null : $alt;
            }
            // Longer or repeated descriptions stay in the text rather than being cut.
            if ($alt !== '' && (! $own || $photos[$imageId] !== $alt)) {
                $content[] = ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $alt]]];
            }
        }

        // Where a photo left a gap, keep the shape the editor needs: a leading paragraph
        // in list items and at least one block in a document.
        if ($removedHere && ($node['type'] ?? null) === 'listItem' && ($content[0]['type'] ?? null) !== 'paragraph') {
            array_unshift($content, ['type' => 'paragraph']);
        }
        if ($removedHere && ($node['type'] ?? null) === 'doc' && $content === []) {
            $content[] = ['type' => 'paragraph'];
        }
        $node['content'] = $content;

        return $node;
    }

    /**
     * Same plain text the application derives from a document, without photo descriptions.
     *
     * @param  array<string, mixed>  $node
     */
    private function text(array $node): string
    {
        $type = $node['type'] ?? null;
        if ($type === 'text') {
            $links = array_filter($node['marks'] ?? [], fn ($mark) => is_array($mark) && ($mark['type'] ?? null) === 'link');

            return (string) ($node['text'] ?? '').implode('', array_map(fn ($mark) => ' ('.($mark['attrs']['href'] ?? '').')', $links));
        }
        if ($type === 'hardBreak') {
            return "\n";
        }

        return implode('', array_map($this->text(...), array_filter($node['content'] ?? [], 'is_array'))).($type === 'paragraph' ? "\n" : '');
    }
};
