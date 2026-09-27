<?php

namespace App\Support;

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
        if (! is_string($raw)) {
            self::invalid($field);
        }
        if (strlen($raw) > 150000) {
            self::invalid($field, 'This text contains too much formatting. Paste it as plain text or split it into shorter contributions.');
        }
        $document = json_decode($raw, true, 20);
        $count = 0;
        $document = self::node($document, ['doc'], 0, $count, $field);
        $request->merge([$field.'_document' => $document, $field => trim(self::text($document))]);
    }

    /** @param list<string> $allowed
     * @return array<string, mixed>
     */
    private static function node(mixed $node, array $allowed, int $depth, int &$count, string $field): array
    {
        if (++$count > 1500 || $depth > 10) {
            self::invalid($field, 'This text contains too much formatting or deeply nested lists. Simplify the lists or paste it as plain text.');
        }
        if (is_array($node) && ($node['type'] ?? null) === 'image') {
            // Only a page opened before galleries existed still sends photos inside the text.
            self::invalid($field, 'Photos now go in the gallery below the text. Reload the page, then add them there.');
        }
        if (! is_array($node) || ! in_array($node['type'] ?? null, $allowed, true)) {
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
                    if (! is_string($href) || ! self::validLink($href)) {
                        self::invalid($field, __('The link on “:text” is not supported. Use a complete http:// or https:// address, or mailto: followed by one email address, without extra parameters. Links must be at most 2048 characters.', ['text' => mb_substr($node['text'], 0, 80)]));
                    }
                    $clean['attrs'] = ['href' => $href];
                }
                $result['marks'][] = $clean;
            }
        } elseif ($type !== 'hardBreak') {
            $children = $node['content'] ?? [];
            if (! is_array($children) || ! array_is_list($children)) {
                self::invalid($field);
            }
            $childTypes = match ($type) {
                'doc', 'listItem' => ['paragraph', 'bulletList', 'orderedList'],
                'paragraph' => ['text', 'hardBreak'],
                default => ['listItem'],
            };
            if ($type === 'orderedList') {
                $start = $node['attrs']['start'] ?? 1;
                $result['attrs'] = ['start' => is_int($start) && $start > 0 && $start <= 9999 ? $start : 1];
            }
            $result['content'] = [];
            foreach ($children as $child) {
                $result['content'][] = self::node($child, $childTypes, $depth + 1, $count, $field);
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
        if ($node['type'] === 'hardBreak') {
            return "\n";
        }

        return implode('', array_map(self::text(...), $node['content'] ?? [])).($node['type'] === 'paragraph' ? "\n" : '');
    }

    private static function validLink(string $href): bool
    {
        if (strlen($href) > 2048 || preg_match('/[\x00-\x20\x7f]/', $href)) {
            return false;
        }
        if (str_starts_with(strtolower($href), 'mailto:')) {
            return (bool) preg_match('/^[a-z0-9.!#$%&\'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/iD', substr($href, 7));
        }

        return (bool) filter_var($href, FILTER_VALIDATE_URL)
            && in_array(strtolower((string) parse_url($href, PHP_URL_SCHEME)), ['http', 'https'], true);
    }

    private static function invalid(string $field, string $message = 'This text contains unsupported formatting. Paste it as plain text using Ctrl+Shift+V (Command+Shift+V on Mac), then apply formatting in the editor.'): never
    {
        throw ValidationException::withMessages([$field => __($message)]);
    }
}
