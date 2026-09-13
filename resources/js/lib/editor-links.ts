// Keep in sync with RichText::validLink. Photo URLs remain HTTP/HTTPS only.
export function validEditorLink(href: string): boolean {
    if (
        new TextEncoder().encode(href).length > 2048 ||
        /\s/u.test(href) ||
        Array.from(href).some(
            (character) =>
                character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        )
    )
        return false;
    if (/^mailto:/i.test(href)) {
        return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
            href.slice(7),
        );
    }
    return /^https?:\/\//i.test(href) && URL.canParse(href);
}

export const editorLinkHelp =
    'Use a complete http:// or https:// address, or mailto: followed by one email address, without extra parameters. Links must be at most 2048 characters.';
