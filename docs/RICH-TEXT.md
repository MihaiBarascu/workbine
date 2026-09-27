# Writing methods and responses

Methods and “I tried this” responses share one Tiptap editor. Writers can add
paragraphs, bold text, lists, numbered steps, HTTP/HTTPS links and single-address
mailto links. Photos go in a gallery below the text. Methods have a title;
responses retain the short outcome choice. There are no mandatory sections or
minimum step counts. Responses require some text, with no artificial minimum
character count. Source attribution and the response's optional date/supporting
link are secondary controls.

## Photo galleries

Each method and response has a gallery of up to six photos, shown below the text
in the author's order and numbered, so the text can refer to “Photo 2”. Each photo
may have a description of up to 140 characters, shown under it and used as its
text alternative; writers can include a step number. Photos upload one at a time
as soon as they are chosen, through the existing image processing, moderation,
storage quotas and upload throttles. Publication waits for uploads to finish, and
validation errors keep the uploaded photos, their order and descriptions.

The form submits only photo ids, order and descriptions, plus a marker that it
manages the gallery; a form without that marker leaves the gallery unchanged.
The server attaches only the author's own uploads that belong to no other
contribution, avatar or earlier evidence, in the same transaction as the text.
Photo URLs and dimensions come from the media ledger, and revision tokens include
photo order and descriptions. Descriptions are checked by text moderation together
with the contribution.

Uploads are staged until publication. Abandoned uploads older than one hour and
photos removed by an edit are eligible for the existing `media:prune` job.
Removing a response removes its photos at once. Photos of hidden contributions
remain unless a moderator deletes them while hiding it; see MODERATION.md. Account
deletion also cleans up photos affected by cascading contribution deletion. Cached
copies retain the media cache behavior described in MEDIA.md. An expired upload
produces a recoverable validation error asking the writer to remove and upload
that photo again.

Before galleries, photos sat inside the text and a response could have one
separate evidence photo. A migration moved them into the galleries in reading
order, with the evidence photo last, where it used to appear. Descriptions of up
to 140 characters became photo descriptions; longer or repeated ones stayed in the
text. A page opened before the change is asked to reload instead of saving photos
into the text.

Plain-text records still render safely and open in the same editor. Editor state
survives validation and toggling the optional first method; durable cross-device
drafts are not implemented.

A method's text and gallery become permanent after another member's first
experience. Dated author updates use a separate plain-text field and do not
replace the original or its photos. A different approach uses the existing new
method editor. See [BROWSER-FLOWS.md](BROWSER-FLOWS.md).

The document is stored as a bounded, allowlisted JSON tree in `body_document`.
The server derives `body` for search, excerpts and moderation, including link
destinations. Public rendering builds React elements; it never injects submitted
HTML.

Reference: [Tiptap React integration](https://tiptap.dev/docs/editor/getting-started/install/react).

## Pasting and recovery

The existing editor parses pasted HTML. Unsupported presentation is simplified;
code blocks become lines of text and table rows become paragraphs with separated
cells. A status message explains these changes. Copied or dropped images are not
added to the text: their alternative text is retained and the notice points to
the gallery. Unsupported link destinations become plain text with a notice naming
the affected text. Plain-text clipboard content remains plain text; Markdown is
not interpreted as formatting.

Email links use `mailto:` followed by one email address, without query parameters.
The editor, public renderer and server use the same allowed link categories;
photo/source/evidence URL rules remain HTTP/HTTPS. The server independently
validates submitted documents, names rejected links, and gives specific recovery
instructions for excessive formatting. Validation keeps the mounted draft
available for correction. No arbitrary HTML is rendered.

The formatting toolbar and link controls remain reachable while scrolling a long
explanation and stop at the editor boundary. The editor continues to own text
selection; no separate formatting state or scrolling service is introduced.
