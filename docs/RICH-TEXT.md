# Writing methods and responses

Methods and “I tried this” responses share one Tiptap editor. Writers can add
paragraphs, bold text, lists, numbered steps, HTTP/HTTPS links, single-address mailto links and photos between
paragraphs. Methods have a title; responses retain the short outcome choice.
There are no mandatory sections or minimum step counts. Responses require some
text, with no artificial minimum character count. Source attribution and the
response's optional date/supporting link are secondary controls.

Photos can be chosen, pasted from the clipboard or dropped into the editor. One
photo uploads at a time; writing and publication pause during that upload so the
insertion point stays stable. The editor reports upload failures without clearing
text, and server validation preserves the mounted editor and uploaded photos.
Selecting an image exposes its description and removal controls. Public images
open at full size. Each document accepts up to 10 images, using the existing image
processing, moderation, storage quotas and upload throttles. This release does
not change storage configuration or upload limits.

The document is stored as a bounded, allowlisted JSON tree in `body_document`.
The server derives `body` for search, excerpts and moderation, including link
destinations and image descriptions. Public rendering builds React elements;
it never injects submitted HTML. Image URLs and dimensions come from the owned
media ledger, not client attributes. Images cannot be claimed from another member,
from avatars/evidence uploads or from another contribution. Attachment and content
updates commit together, and method revision tokens include formatting changes.

Image uploads are staged until publication. Abandoned images older than one hour
and images detached by an edit are eligible for the existing `media:prune` job.
Referenced images remain protected even when their contribution is hidden.
Account deletion also cleans up images affected by cascading contribution deletion.
Cached copies retain the existing media cache behavior described in MEDIA.md.
An expired upload produces a recoverable validation error asking the writer to
remove and upload that image again.

Plain-text records still render safely and open in the same editor. Previously
attached evidence images retain their display/removal controls. This compatibility
is not a claim that any particular deployment contains existing contributions.
Editor state survives validation and toggling the optional first method; durable
cross-device drafts are not implemented.

A method's rich text and attached photos become permanent after another member's
first experience. Dated author updates use a separate plain-text field and do not
replace the original or its images. A different approach uses the existing new
method editor. See [BROWSER-FLOWS.md](BROWSER-FLOWS.md).

References: [Tiptap React integration](https://tiptap.dev/docs/editor/getting-started/install/react)
and [image extension](https://tiptap.dev/docs/editor/extensions/nodes/image).

## Pasting and recovery

The existing editor parses pasted HTML. Unsupported presentation is simplified;
code blocks become lines of text and table rows become paragraphs with separated
cells. A status message explains these changes. Copied external images are not
uploaded automatically: their alternative text is retained and the notice points
to Photo. Unsupported link destinations become plain text with a notice naming
the affected text. Plain-text clipboard content remains plain text; Markdown is
not interpreted as formatting.

Email links use `mailto:` followed by one email address, without query parameters.
The editor, public renderer and server use the same allowed link categories;
photo/source/evidence URL rules remain HTTP/HTTPS. The server independently
validates submitted documents, names rejected links, and gives specific recovery
instructions for photo limits, descriptions and excessive formatting. Validation
keeps the mounted draft available for correction. No arbitrary HTML is rendered.

The formatting toolbar and link controls remain reachable while scrolling a long
explanation and stop at the editor boundary. The editor continues to own text
selection; no separate formatting state or scrolling service is introduced.
