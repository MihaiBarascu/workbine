# Writing methods and responses

Methods and “I tried this” responses share one Tiptap editor. Writers can add
paragraphs, bold text, lists, numbered steps, HTTP/HTTPS links and photos between
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

References: [Tiptap React integration](https://tiptap.dev/docs/editor/getting-started/install/react)
and [image extension](https://tiptap.dev/docs/editor/extensions/nodes/image).
