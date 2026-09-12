<?php

namespace App\Support;

use App\Models\Experience;
use App\Models\MediaImage;
use App\Models\Method;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RichText
{
    /** Decode a bounded, allowlisted document. Plain body remains searchable and moderatable. */
    public static function prepare(Request $request, string $prefix = ''): void
    {
        $field = $prefix.'body';
        $raw = $request->input($field.'_document');
        if ($raw === null || $raw === '') {
            return;
        }
        if (! is_string($raw) || strlen($raw) > 150000) {
            self::invalid($field);
        }
        $document = json_decode($raw, true, 20);
        $count = 0;
        $images = 0;
        $document = self::node($document, ['doc'], 0, $count, $images, $field);
        $request->merge([$field.'_document' => $document, $field => trim(self::text($document))]);
    }

    /** @param list<string> $allowed
     * @return array<string, mixed>
     */
    private static function node(mixed $node, array $allowed, int $depth, int &$count, int &$images, string $field): array
    {
        if (! is_array($node) || ++$count > 1500 || $depth > 10 || ! in_array($node['type'] ?? null, $allowed, true)) {
            self::invalid($field);
        }
        $type = $node['type'];
        $result = ['type' => $type];
        if ($type === 'text') {
            if (! is_string($node['text'] ?? null) || $node['text'] === '') {
                self::invalid($field);
            }
            $result['text'] = $node['text'];
            $marks = $node['marks'] ?? [];
            if (! is_array($marks) || count($marks) > 3) {
                self::invalid($field);
            }
            foreach ($marks as $mark) {
                if (! is_array($mark) || ! in_array($mark['type'] ?? '', ['bold', 'italic', 'link'], true)) {
                    self::invalid($field);
                }
                $clean = ['type' => $mark['type']];
                if ($mark['type'] === 'link') {
                    $href = $mark['attrs']['href'] ?? null;
                    if (! is_string($href) || strlen($href) > 2048 || ! filter_var($href, FILTER_VALIDATE_URL)
                        || ! in_array(strtolower((string) parse_url($href, PHP_URL_SCHEME)), ['http', 'https'], true)) {
                        self::invalid($field);
                    }
                    $clean['attrs'] = ['href' => $href];
                }
                $result['marks'][] = $clean;
            }
        } elseif ($type === 'image') {
            $id = $node['attrs']['imageId'] ?? null;
            $alt = $node['attrs']['alt'] ?? '';
            if (! is_int($id) || $id < 1 || ++$images > 10 || ! is_string($alt) || mb_strlen($alt) > 300) {
                self::invalid($field);
            }
            // Never trust a submitted image URL, dimensions or HTML attributes.
            $result['attrs'] = ['imageId' => $id, 'alt' => $alt];
        } elseif ($type !== 'hardBreak') {
            $children = $node['content'] ?? [];
            if (! is_array($children) || ! array_is_list($children)) {
                self::invalid($field);
            }
            $childTypes = match ($type) {
                'doc', 'listItem' => ['paragraph', 'bulletList', 'orderedList', 'image'],
                'paragraph' => ['text', 'hardBreak'],
                default => ['listItem'],
            };
            if ($type === 'orderedList') {
                $start = $node['attrs']['start'] ?? 1;
                $result['attrs'] = ['start' => is_int($start) && $start > 0 && $start <= 9999 ? $start : 1];
            }
            $result['content'] = [];
            foreach ($children as $child) {
                $result['content'][] = self::node($child, $childTypes, $depth + 1, $count, $images, $field);
            }
        }

        return $result;
    }

    /** @param array<string, mixed> $node */
    public static function text(array $node): string
    {
        if ($node['type'] === 'text') {
            $links = array_filter($node['marks'] ?? [], fn ($mark) => $mark['type'] === 'link');

            return $node['text'].implode('', array_map(fn ($mark) => ' ('.$mark['attrs']['href'].')', $links));
        }
        if ($node['type'] === 'image') {
            return ($node['attrs']['alt'] ?? '')."\n";
        }
        if ($node['type'] === 'hardBreak') {
            return "\n";
        }

        return implode('', array_map(self::text(...), $node['content'] ?? [])).($node['type'] === 'paragraph' ? "\n" : '');
    }

    /** Attach inside the contribution transaction, with image locks shared by pruning.
     * @param  array<string, mixed>|null  $document
     */
    public static function save(Method|Experience $model, ?array $document, string $field = 'body'): void
    {
        $column = $model instanceof Method ? 'rich_method_id' : 'rich_experience_id';
        $other = $model instanceof Method ? 'rich_experience_id' : 'rich_method_id';
        $ids = [];
        $walk = function (array &$node) use (&$walk, &$ids, $model, $column, $other, $field): void {
            if ($node['type'] === 'image') {
                $image = MediaImage::query()->whereKey($node['attrs']['imageId'])->lockForUpdate()->first();
                if ($image === null || $image->user_id !== $model->user_id || ! $image->rich_text || $image->pending_deletion
                    || $image->{$other} !== null || ($image->{$column} !== null && $image->{$column} !== $model->id)) {
                    throw ValidationException::withMessages([$field => __('An image is no longer available. Remove it and upload it again.')]);
                }
                $image->update([$column => $model->id]);
                $ids[] = $image->id;
                $node['attrs'] = [...$node['attrs'], 'src' => $image->url(), 'width' => $image->width, 'height' => $image->height];
            }
            if (isset($node['content'])) {
                foreach ($node['content'] as &$child) {
                    $walk($child);
                }
            }
        };
        if ($document !== null) {
            $walk($document);
        }
        MediaImage::query()->where($column, $model->id)->whereNotIn('id', $ids)
            ->update([$column => null, 'pending_deletion' => true]);
        $model->update(['body_document' => $document]);
    }

    private static function invalid(string $field): never
    {
        throw ValidationException::withMessages([$field => __('This text could not be saved. Use paragraphs, lists, links and up to 10 uploaded photos.')]);
    }
}
