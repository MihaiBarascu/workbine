# Browser flow inventory

This inventory maps the user-facing routes and mutations currently represented by
the browser suite. A screenshot or successful page load shows that the UI rendered;
it does not prove that a mutation succeeded. The Playwright pilot uses
[fixtures.ts](../tests/e2e/fixtures.ts) and isolated verified accounts. Legacy scripts
use their own local preview fixtures and may cover additional states.

The inventory uses per-flow sections instead of a very wide table so that route,
assertion and boundary changes remain readable in source diffs. File references
identify assertions to inspect, not proof that the current revision has passed.
Record actual run revisions and outcomes separately in the release handoff.

## Discovery and contributions

### Browse discovery, search and pagination

Routes: `GET /topics`, query/category/tag/sort/scope links, `GET /community/guide`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) (search/category),
[discovery-draft.cjs](../tests/browser/discovery-draft.cjs),
[discovery-flow.cjs](../tests/browser/discovery-flow.cjs) and
[topic-clarity.cjs](../tests/browser/topic-clarity.cjs).
Backend: [TopicSearchTest.php](../tests/Feature/TopicSearchTest.php),
[ConnectedDiscoveryTest.php](../tests/Feature/ConnectedDiscoveryTest.php) and
[TopicDraftTest.php](../tests/Feature/TopicDraftTest.php).
Discovery filtering has broader backend coverage than the pilot; starter ideas
remain explicitly illustrative.

### Publish a topic and optional first method

Routes: `GET /topics/create`, `POST /topics`, with optional categories and tags.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts),
[community-flow.cjs](../tests/browser/community-flow.cjs),
[topic-clarity.cjs](../tests/browser/topic-clarity.cjs) and
[moderation-flow.cjs](../tests/browser/moderation-flow.cjs).
Backend: [TopicsTest.php](../tests/Feature/TopicsTest.php),
[TopicWithMethodTest.php](../tests/Feature/TopicWithMethodTest.php) and
[TopicDraftTest.php](../tests/Feature/TopicDraftTest.php).
Both topic-only and first-method paths are implemented. Held moderation and
provider outages are simulated locally.

### Publish and edit methods

Routes: `GET /topics/{topic}/methods/create`, `POST /topics/{topic}/methods`,
`GET /topics/{topic}/methods/{method}/edit` and
`PATCH /topics/{topic}/methods/{method}`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) (first method),
[launch-flow.cjs](../tests/browser/launch-flow.cjs) and
[media-flow.cjs](../tests/browser/media-flow.cjs).
Backend: [MethodsTest.php](../tests/Feature/MethodsTest.php) and
[ContributionEditingTest.php](../tests/Feature/ContributionEditingTest.php).
Untried methods remain editable; tried methods use dated notes as described below.

### Share, edit and remove an experience

Routes: `GET .../experiences`, `GET .../experiences/create`, `PUT .../experience`
and `DELETE .../experience`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) (publication/persistence),
[community-flow.cjs](../tests/browser/community-flow.cjs),
[launch-flow.cjs](../tests/browser/launch-flow.cjs) and
[media-flow.cjs](../tests/browser/media-flow.cjs).
Backend: [ExperiencesTest.php](../tests/Feature/ExperiencesTest.php) and
[ExperienceFiltersTest.php](../tests/Feature/ExperienceFiltersTest.php).
Ownership, one experience per member/method and validation also have backend tests.

### Inline photos, evidence and avatars

Routes: `POST /editor/images`, profile/avatar upload/delete and experience image
controls. Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) (inline method photo),
[media-flow.cjs](../tests/browser/media-flow.cjs) and
[moderation-flow.cjs](../tests/browser/moderation-flow.cjs).
Backend: [RichTextTest.php](../tests/Feature/RichTextTest.php) and
[ImageUploadsTest.php](../tests/Feature/ImageUploadsTest.php).
These cover local processing/storage, not deployment-specific R2 delivery.
The rich-method script waits for editor focus after toolbar actions and checks
that the original paragraph and two list items survive before and after publishing.
It does not bypass the visible editor or replace publication with fixture writes.

### Edit topics

Routes: `GET /topics/{topic}/edit`, `PATCH /topics/{topic}`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) (owner persistence/non-owner 403)
and [launch-flow.cjs](../tests/browser/launch-flow.cjs) (stale editor).
Backend: [ContributionEditingTest.php](../tests/Feature/ContributionEditingTest.php)
covers conflicts and ownership. The action is implemented.

### Save and unsave topics

Routes: `PUT/DELETE /topics/{topic}/saved`, `GET /saved`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts) and
[launch-flow.cjs](../tests/browser/launch-flow.cjs), including logout cleanup.
Backend: [SavedTopicsTest.php](../tests/Feature/SavedTopicsTest.php) and
[TopicSaveCountsTest.php](../tests/Feature/TopicSaveCountsTest.php).
Account-deletion cleanup is backend covered; save identities/lists remain private.

### Appreciations and discovery sorting

Routes: `PUT/DELETE /topics/{topic}/like`, `/topics?view=trending`,
`view=saved` (Most saved), latest/unanswered and category/tag filters.
Browser: [discovery-flow.cjs](../tests/browser/discovery-flow.cjs) checks
appreciation/removal and discovery controls;
[discovery-draft.cjs](../tests/browser/discovery-draft.cjs) adds navigation coverage.
Backend: [ConnectedDiscoveryTest.php](../tests/Feature/ConnectedDiscoveryTest.php).
Appreciations do not change reputation. A reputation leaderboard is not implemented
by product decision.

### Notifications and personal navigation

Routes: `GET /notifications`, `POST /notifications/read`,
`POST /notifications/{id}/open`, `/members/{username}?view=topics`, `/saved`
and `/settings/profile`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts),
[community-flow.cjs](../tests/browser/community-flow.cjs),
[discovery-flow.cjs](../tests/browser/discovery-flow.cjs),
[launch-flow.cjs](../tests/browser/launch-flow.cjs) and
[profile-flow.cjs](../tests/browser/profile-flow.cjs).
Backend: [CommunityNotificationsTest.php](../tests/Feature/CommunityNotificationsTest.php),
[MemberProfileTest.php](../tests/Feature/MemberProfileTest.php) and
[SavedTopicsTest.php](../tests/Feature/SavedTopicsTest.php).
Recipient-only notifications are implemented in-app; notification emails are not.

## Profiles and accounts

### Public profiles, impact and username changes

Routes: `GET /members/{username}`, legacy numeric redirects and profile updates.
Browser: [profile-flow.cjs](../tests/browser/profile-flow.cjs) and
[launch-flow.cjs](../tests/browser/launch-flow.cjs).
Backend: [MemberProfileTest.php](../tests/Feature/MemberProfileTest.php),
[MemberUsernameTest.php](../tests/Feature/MemberUsernameTest.php),
[MemberImpactTest.php](../tests/Feature/MemberImpactTest.php) and
[ReputationTest.php](../tests/Feature/ReputationTest.php).
Previous usernames are released rather than retained as aliases. Public field
serialization and privacy have backend coverage.

### Profile details and avatar settings

Routes: `GET/PATCH /settings/profile`, avatar `POST/DELETE`.
Browser: [profile-flow.cjs](../tests/browser/profile-flow.cjs),
[media-flow.cjs](../tests/browser/media-flow.cjs) and
[moderation-flow.cjs](../tests/browser/moderation-flow.cjs).
Backend: [ProfileUpdateTest.php](../tests/Feature/Settings/ProfileUpdateTest.php)
and [ImageUploadsTest.php](../tests/Feature/ImageUploadsTest.php).
External moderation and object storage remain deployment boundaries.

### Login and logout

Routes: `GET/POST /login`, `POST /logout`.
Browser: [flows.spec.ts](../tests/e2e/flows.spec.ts),
[profile-flow.cjs](../tests/browser/profile-flow.cjs) (bad credentials) and
[launch-flow.cjs](../tests/browser/launch-flow.cjs) (intended return/history).
Backend: [AuthenticationTest.php](../tests/Feature/Auth/AuthenticationTest.php)
and [AccountRequestLimitsTest.php](../tests/Feature/Auth/AccountRequestLimitsTest.php).
Password login is exercised; Google and passkeys have separate boundaries below.

### Password confirmation and change

Routes: `GET /settings/security`, `PUT /settings/password`.
Browser: [coverage.spec.ts](../tests/e2e/coverage.spec.ts) changes the password,
rejects the old password and relogs in with the new one;
[profile-flow.cjs](../tests/browser/profile-flow.cjs) confirms access/opens security.
Backend: [SecurityTest.php](../tests/Feature/Settings/SecurityTest.php) and
[PasswordSessionRevocationTest.php](../tests/Feature/Auth/PasswordSessionRevocationTest.php).
Session revocation is backend covered. The pilot closes the former change/relogin
mutation gap without proving provider behavior.

### Account deletion

Route: `DELETE /settings/profile` from the profile dialog.
Browser: [coverage.spec.ts](../tests/e2e/coverage.spec.ts) checks wrong-password
recovery, deletion, logout, failed relogin and deleted public profile.
[profile-flow.cjs](../tests/browser/profile-flow.cjs) only opens/cancels the dialog.
Backend: [ProfileUpdateTest.php](../tests/Feature/Settings/ProfileUpdateTest.php)
and [ImageUploadsTest.php](../tests/Feature/ImageUploadsTest.php).
Destructive browser mutations use isolated test accounts only.

### Change account email

Route: `PATCH /settings/profile`, followed by the verification gate.
Browser: [coverage.spec.ts](../tests/e2e/coverage.spec.ts) checks verification status,
persisted replacement email and blocked contribution access.
Backend: [ProfileUpdateTest.php](../tests/Feature/Settings/ProfileUpdateTest.php)
and [AccountVerificationTest.php](../tests/Feature/Auth/AccountVerificationTest.php).
The current behavior replaces the email immediately and marks it unverified;
these tests do not introduce a pending-email confirmation design. Mail delivery
remains a deployment concern.

### Registration, email verification and resend

Routes: `GET/POST /register`, `/email/verify` and verification notification actions.
Browser: [community-flow.cjs](../tests/browser/community-flow.cjs),
[launch-flow.cjs](../tests/browser/launch-flow.cjs),
[profile-flow.cjs](../tests/browser/profile-flow.cjs),
[verify-account.cjs](../tests/browser/verify-account.cjs) and
[turnstile-flow.cjs](../tests/browser/turnstile-flow.cjs).
Backend: [RegistrationTest.php](../tests/Feature/Auth/RegistrationTest.php),
[EmailVerificationTest.php](../tests/Feature/Auth/EmailVerificationTest.php) and
[TurnstileRegistrationTest.php](../tests/Feature/Auth/TurnstileRegistrationTest.php).
[turnstile-widget.cjs](../tests/browser/turnstile-widget.cjs) exercises the real
service with test keys; router tests simulate failures. Production inbox, DNS
and live site-key configuration require deployment verification.

### Password reset

Routes: `GET/POST /forgot-password` and the token reset form.
Browser: [profile-flow.cjs](../tests/browser/profile-flow.cjs) and
[turnstile-flow.cjs](../tests/browser/turnstile-flow.cjs) render the forms only.
Backend: [PasswordResetTest.php](../tests/Feature/Auth/PasswordResetTest.php).
End-to-end token receipt, reset and relogin are not browser-attested; real mail
is external. A controlled local token test can cover submission separately.

### Two-factor authentication and recovery codes

Routes: security settings, challenge and recovery selector.
Browser: [profile-flow.cjs](../tests/browser/profile-flow.cjs) opens setup and
exercises a synthetic challenge/recovery path.
Backend: [TwoFactorChallengeTest.php](../tests/Feature/Auth/TwoFactorChallengeTest.php)
covers the challenge. Setup confirmation, disable and recovery-code rotation
remain browser gaps. TOTP is application behavior; physical device support needs
separate verification.

### Appearance

Route: `GET /settings/appearance`, with light/dark controls.
[profile-flow.cjs](../tests/browser/profile-flow.cjs) checks persistence in the
browser. There is no separate backend evidence listed for this flow.

### Google and passkeys

Google routes: `/auth/google` and callback. Backend:
[GoogleAuthenticationTest.php](../tests/Feature/GoogleAuthenticationTest.php).
There is no synthetic browser mutation against Google; it is an external boundary.

Passkey controls exist in security settings for enrollment/list/removal.
[SecurityTest.php](../tests/Feature/Settings/SecurityTest.php) covers page
configuration only. No browser scenario currently exercises a virtual or physical
authenticator. Add controlled WebAuthn coverage when the runner contract supports it.

## Access, reporting and moderation

### Guests, unverified accounts and branded errors

Routes: guest save/experience redirects, unverified contribution gates,
invalid/missing routes and failed Inertia navigation.
Browser: [community-flow.cjs](../tests/browser/community-flow.cjs),
[launch-flow.cjs](../tests/browser/launch-flow.cjs),
[coverage.spec.ts](../tests/e2e/coverage.spec.ts) and
[capture-public.cjs](../tests/browser/capture-public.cjs).
Backend: [AccountVerificationTest.php](../tests/Feature/Auth/AccountVerificationTest.php),
[SavedTopicsTest.php](../tests/Feature/SavedTopicsTest.php),
[ExperiencesTest.php](../tests/Feature/ExperiencesTest.php) and
[ErrorPagesTest.php](../tests/Feature/ErrorPagesTest.php).
Registration and verification setup use synthetic local mail. Provider/server
operational failures still require deployment verification.

### Reports

Routes: `GET/POST /reports/{type}/{id}`.
[launch-flow.cjs](../tests/browser/launch-flow.cjs) submits a method report;
[ContentReportsTest.php](../tests/Feature/ContentReportsTest.php) also covers topic
and experience branches. Those two forms lack dedicated browser assertions.
Dismiss/hide/restore report decisions also need browser coverage; the moderation
script below handles pre-publication reviews rather than those report decisions.

### Moderation queue and decisions

Routes: `GET /moderation`, review/report detail and decision endpoints.
Browser: [moderation-flow.cjs](../tests/browser/moderation-flow.cjs) covers held
review approval, outage review and profile-photo review.
Backend: [ContentModerationTest.php](../tests/Feature/ContentModerationTest.php)
covers decisions. The UI is implemented for verified moderators. OpenAI access,
policy configuration and human operations are deployment boundaries.

### Deliberately unavailable actions

There is no public topic/method deletion route or voting/thanks UI. No browser
evidence is expected for these unimplemented product decisions; do not classify
them as missing tests. Appreciations are a distinct, implemented action.

## Coherent community journey

[community-journey.spec.ts](../tests/e2e/community-journey.spec.ts) uses three
verified members in separate browser sessions on one topic. Contributions,
uploads, saves, appreciations and experiences are submitted through the UI;
fixtures only provide accounts and an unrelated starter topic/method.

The expected reputation is calculated from the documented rules, not copied from
the service output: two external saves plus worked/partly outcomes give the topic
and method author 9 points; another method author receives 5 points for a worked
outcome. Changing the worked outcome to negative leaves 4 points for the first
author; removing one save leaves 3. Appreciations give no points.
See [REPUTATION.md](REPUTATION.md) for eligibility and supporter caps.

This journey complements smaller independent scenarios. Cross-topic support caps,
moderation visibility and changes to verification eligibility retain their backend
checks in [ReputationTest.php](../tests/Feature/ReputationTest.php); this one journey
does not attest all reputation permutations or external provider behavior.

## Preserving tried methods

A method's first experience from another member permanently preserves its title,
rich text, attached photos and source. Deleting or hiding that experience, or
removing its author account, does not reopen editing. Before that point, normal
editing and stale-editor protection remain available. Authors of preserved methods
can append dated plain-text notes (up to 5,000 characters), or share a different
approach as a new method. Notes cannot be rewritten through the application and
carry no reputation points. Earlier experiences do not endorse those notes.

[method-preservation.spec.ts](../tests/e2e/method-preservation.spec.ts) exercises
the original photo/source, a stale editor crossing the first response, a dated
note, access control, response removal and reputation on desktop/mobile.
[MethodPreservationTest.php](../tests/Feature/MethodPreservationTest.php) covers
server enforcement, permanent preservation, duplicate submissions, validation,
migration backfill and unchanged reputation semantics.

[method-update-retry.spec.ts](../tests/e2e/method-update-retry.spec.ts) adds
lost-response scenarios on desktop/mobile. It sends a real isolated update POST,
checks the Inertia fragment-redirect response, then discards that response.
Identical retries must confirm the existing note without duplication. Changed
retries must retain the draft, show a conflict, focus the editor and require an
explicit action before publishing under a new submission ID. Reviewing the
published note opens another tab without discarding the draft.
[MethodUpdateRetryTest.php](../tests/Feature/MethodUpdateRetryTest.php) checks
unchanged original content/timestamps, normalized identical retries, conflict
errors/old input, a fresh server-issued ID and per-method submission scoping.
The feature test carries the response session cookie into the redirected GET.
These are coverage contracts; consult the current PR for execution results.

The browser submits the required method content token with every experience write,
including response edits. The server rejects a missing token before writing; a
stale token requires reviewing the current method before retrying.
`ExperiencesTest` covers missing tokens for both creation and replacement, and
`MethodUpdateRetryTest` also checks JSON 422 conflicts without changing a published
note. This is conflict detection,
not a version archive. Backfill preserves current methods with existing responses,
including hidden ones; it cannot reconstruct earlier edits or deleted responses.
Experience authors can still change their own result, and current-record reputation
recalculates accordingly. Experiences themselves do not receive review scores.

## Highest-priority remaining browser gaps

- Password-reset token receipt, reset submission and relogin need a controlled
  mail/inbox integration test. Token submission can be tested locally with
  controlled setup; real inbox delivery is separate.
- 2FA setup confirmation, disable/recovery-code rotation, passkey enrollment/login/removal,
  topic/experience report forms, report decisions and publishing restoration remain
  browser gaps.
- Google OAuth, production Turnstile configuration, real email delivery, R2
  behavior and physical passkeys require deployment or provider-specific
  verification.
- Firefox/WebKit and physical mobile devices are outside the Chromium pilot.

Maintain this inventory when routes or user actions change. It does not claim
that every input/state combination is covered. The original six scenarios remain
in `flows.spec.ts`; the three account scenarios added by Luna are in
`coverage.spec.ts`.
