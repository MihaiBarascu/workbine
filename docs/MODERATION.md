# Content moderation

Workbine uses one Laravel moderation service before publishing public text or
uploading a processed image to public storage. A small private `/moderation`
page combines held submissions and existing community reports. It uses normal
verified sign-in, a server-side authorization gate and existing React components.
No separate application, role-management package or queue worker is needed.

## Activation

Set these in the deployment environment, using real values only in its protected
configuration:

```dotenv
CONTENT_MODERATION_ENABLED=true
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
MODERATION_ADMIN_USER_IDS=YOUR_EXISTING_MEMBER_ID
COMMUNITY_REPORTS_ENABLED=true
```

The administrator list contains immutable numeric user IDs, separated by commas.
Never authorize by a username that another member can claim after a rename.
Only listed accounts with verified email can access the page, its actions and its
private image endpoint. The account menu shows **Moderation** to those accounts.
Keep the key off the frontend and out of Git. Deploy through the normal Dokploy
release path so configuration is reloaded. Confirm the selected account can open
the page and adopt regular review before enabling reports and automated holds.
The flags are disabled by default for unconfigured installations.

OpenAI currently describes the moderation endpoint as free; account access and
rate limits still apply. The application calls `/v1/moderations` with
`omni-moderation-latest`, with a 3-second connection and 12-second total timeout,
no redirect following and no automatic retry storm. Existing submission and
upload limits remain, plus 30 provider calls/minute per member or guest IP and
200/minute across the application. See the
[official OpenAI moderation guide](https://developers.openai.com/api/docs/guides/moderation).

## Member experience

- Topic creation (including an optional first method), topic/method edits,
  experiences, changed public profile fields and uploaded avatars/evidence are
  checked before saving. Topic and first-method text use one request. Images are
  decoded, bounded, stripped of metadata and converted to WebP before checking;
  a held image never receives a public R2 object or MediaImage reservation.
- Registration checks the public display name. A rejected name can be changed or
  raised with support. Google sign-in uses `Member` if the provider name cannot
  pass a check, preserving login without exposing an unchecked name.
- A normal submission publishes through the existing flow. A held submission
  produces a field error with a private review reference, preserving the current
  form. Existing public content remains unchanged when an edit is held.
- Human approval permits the same member to resubmit the exact content in the
  same context. It does not automatically publish, overwrite a newer edit, waive
  normal permissions or bypass a publishing suspension. Changed submissions need
  another check. Approvals expire with their review record.
- Provider failures, malformed responses, missing keys and exhausted limits
  leave the contribution unpublished and show a retry message. They do not create
  misleading violation records. Browser form preservation is not a server draft
  backup; refreshing or leaving the page can discard unsaved changes/files.

## Review policy

The application holds the provider's positive categories for sexual content,
sexual content involving minors, graphic violence, hate, hateful threats,
threatening harassment, violent illicit instructions and self-harm instructions.
It deliberately does not treat the provider's broad `flagged` value as a ban:
health/recovery discussion or descriptions of violence are not automatically
removed just because of their subject. These classifications can be wrong in
either direction. Operators inspect context and record a reason for decisions.
The policy is versioned in `config/moderation.php`; change its version when
changing categories so old approvals do not silently override new rules.

The provider has different text/image coverage: for example `sexual/minors`,
hate and harassment categories are text-only. This is not a universal detector
of illegality, scams, privacy violations or every harmful image. External source
and evidence URL strings are included as text; linked pages are never fetched.
Previously published content is not retrospectively scanned in this release.
User reports and human judgment remain necessary for these gaps.

## Daily review

Open **Account menu → Moderation**:

1. **Held submissions** shows unpublished text or images. Open an item, reveal
   an image deliberately if needed, choose approve/reject and write a reason.
2. **Community reports** shows reported content and report context. Hide content
   or dismiss the report. Include reviewed items to revisit decisions or restore
   content hidden through a report.
3. Leave author publishing access unchanged normally. Suspend it only after
   manually confirming serious or repeated abuse. The same control restores
   access. The **Publishing suspensions** list also lets you restore access after
   the original review record has expired. Suspension stops public text/image changes but permits browsing,
   account security, email changes, account deletion and removal of own images or
   experiences. It does not retroactively hide all of an author's contributions.

Report submissions retain the existing five/minute and one/member/contribution
limits. Reporting never automatically hides content. Hiding a topic also hides
its methods and experiences; hiding a method hides its experiences. History is
retained. Restoring a child does not override a hidden parent. The latest web
review records its time, decision note and reviewer ID. Reporter identities are
not exposed to authors or other members. No automatic account ban is made.

This initial workflow has no automatic review emails or separate author inbox.
Members can retry a held form or request reconsideration with the review
reference through the operator's established support channel. Check the private
page regularly; neither enabling the flag nor receiving user reports creates an
operator rota or guarantees prompt decisions.

## Private data and retention

Only text/photos intended for publication go to OpenAI, not email addresses,
passwords, account IDs or report details. Follow the provider's
[data controls](https://developers.openai.com/api/docs/guides/your-data) for its own
retention rules; local retention is a separate matter.

Flagged snapshots are encrypted with Laravel's application key in the database.
Images are bounded to the existing processed upload size. Up to 20 review records
per member are retained, including decisions, to bound repeated uploads. Exact
retries reuse a keyed fingerprint scoped to member, content, context and policy.
Snapshots, notes and fingerprints never appear in public model serialization;
private pages use encrypted Inertia history and private/no-store responses.
A private image endpoint checks administrator access on every request.

Review records expire after 30 days and are removed on the next moderation list
visit or flagged submission. `php artisan moderation:prune` is also available for
an existing maintenance schedule; this release does not create a new scheduled
job. Account deletion cascades to review records. Do not publish private review
screenshots or copy real flagged material to public logs, issues or test assets.
Logs record provider failure status only, never request/response bodies.

Hiding existing public content does not invalidate previously shared R2 URLs or
cached copies. Remove prohibited originals through the existing protected media
operations and purge relevant caches where necessary; do not assume a hidden
page has removed the underlying file.

## Cloudflare complement

Cloudflare's free CSAM scanning can compare **cached images** against known
material. It is a separate zone setting, not enabled by this code, not a general
pornography classifier and not a pre-publication guarantee. Configure its
notification recipient and handle detections through authorized operations.
See [Cloudflare CSAM scanning](https://developers.cloudflare.com/cache/reference/csam-scanning/).

## Console fallback

The existing `reports:review` and `content:restore` commands remain available for
authorized maintenance; daily review no longer requires them. Console decisions
have no web reviewer identity. Use the web page for ordinary review.

## Verification

Run `bash tools/test-local.sh` in a usable local Docker environment. Feature tests
simulate provider decisions and exercise private holds, unchanged public edits,
image storage boundaries, authorization, exact resubmission, outages, reporting,
manual suspension and retention. The test-only browser router is gated to the
isolated testing server and uses benign synthetic material; it never calls
OpenAI. Browser coverage checks form preservation, moderation decisions, private
images and mobile/desktop appearance. These checks verify integration behavior,
not the provider's classification accuracy or live account configuration.
