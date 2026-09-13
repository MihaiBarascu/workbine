# Workbine status

Last updated: 2026-09-13.

This is a public repository. This handoff records product behavior, completed
releases and development rules. Account details, server inventories, operational
check results, customer activity and recovery arrangements belong in the private
handoff described in [AGENTS.md](../AGENTS.md), not in public commits or PRs.

## Current integration handoff

The merged baseline includes shared navigation (#39, `a0402d9`) and method-update
retry recovery (#37, `0626f26`), alongside releases #25–#36 described below. The
sidebar now collapses on desktop and uses an accessible mobile drawer across
community and account pages; see [SHARED-NAVIGATION.md](SHARED-NAVIGATION.md).
Lost-response retries preserve the draft, distinguish an already published note
from conflicting text, and require explicit publication of a new dated update.
The duplicate #38 was closed; its additional JSON conflict regression is retained
in `MethodUpdateRetryTest` without restoring the superseded editor implementation.

Experience writes require the method content revision, including updates to an
existing response. Missing tokens fail validation; stale tokens are rejected under
the same method lock used by editing. Rejected submissions cannot create a response
or preserve an untried method. The browser already sends this token. Tests for
notifications, moderation, reports, images and preservation submit it explicitly
so those checks still reach their intended behavior.

Use the current PR's recorded local gate for this change. Older CI failures on
#40's initial source reflected incomplete request fixtures; passing UI checks on
that source were not a passing release gate. Historical branch names, squash-merge
ancestry and old PR comments do not identify unfinished product work. Inspect the
current source and final PR status before resuming another agent's branch.

## Preserving tried methods

The first experience from another member permanently preserves a method's original
title, explanation, photos and source. Authors can then add dated plain-text notes
or publish a different approach as a new method. Notes are separate from the
original and receive no reputation; earlier experiences do not evaluate them.
Removing an experience does not reopen the original editor. Existing response
editing and reputation recalculation remain available. The migration includes
hidden responses when preserving existing methods, without a full version archive.
See [BROWSER-FLOWS.md](BROWSER-FLOWS.md) for coverage and boundaries. The full
local gate passed on application source `752d983`: build, frontend lint/format and
TypeScript, Pint, PHPStan, 341 tests / 3708 assertions on each of SQLite and
PostgreSQL, 13 Python tests, all existing browser scripts and 22 Playwright checks
across desktop/mobile (1.8 minutes). The protected editor and dated-note captures
were reviewed. Luna authored the new backend and browser scenarios; saved runs
make no model calls.

## Browser flow inventory

[BROWSER-FLOWS.md](BROWSER-FLOWS.md) maps current user actions to browser and
backend assertions, separating missing browser coverage from unavailable product
actions and external-service verification. Three account scenarios authored by
Luna add actual password change/relogin, account deletion with validation recovery,
and the existing email-change reverification behavior. The reviewed targeted run
passed six checks across desktop/mobile; full release evidence belongs to the PR.
A further Luna-authored journey uses three member sessions on one newly published
topic, including an inline image, three attributed methods, appreciations/saves,
cross-member experiences and exact reputation transitions 2 → 9 → 4 → 3.
The reviewed journey passed desktop/mobile in 23.6 seconds; it keeps methods tried
distinct from experience totals. The fixture supplies three verified accounts,
and publication/feedback happen through the UI. These tests do not redesign
account behavior or claim full launch readiness.

## Browser testing pilot

The independent Playwright Test pilot adds six real scenarios on desktop and
mobile Chromium, alongside the existing browser scripts. The reviewed suite
passed 36/36 checks across three repetitions with zero retries. Cosmetic
variation passed 6/6; three injected browser faults each triggered the expected
failure. The shared SQLite preview uses one worker after repeated parallel runs
exposed database lock errors.

Use [BROWSER-PILOT.md](BROWSER-PILOT.md) for commands, coverage boundaries and
the Luna authoring evaluation. Routine saved test execution makes no model calls;
this session did not expose Luna token usage, so no cost saving is claimed.

## Connected community discovery

The updated discovery follows the owner’s globe reference: sidebar navigation,
original generated artwork, pointer lighting/parallax, compact cards, and a
hideable guide. Categories remain plain text beside titles. **Create topic** opens
the form without publishing. Topics can have optional categories and tags when
created or edited; filtering, recent-activity/most-saved views, reversible appreciations and public
name/username search are implemented. Appreciations do not alter reputation.
See [CONNECTED-DESIGN.md](CONNECTED-DESIGN.md) for precise semantics and the asset.

The disposable local gate passed on application source `46f6f3e`: frontend build,
formatting/lint, TypeScript, Pint, PHPStan, 332 tests / 3614 assertions on each of
SQLite and PostgreSQL, 13 Python tests and complete browser flows. Desktop, tablet,
mobile, dark appearance, photo cards and pointer/reduced-motion captures were
reviewed. The final browser recovery-code selector was corrected before its flow
ran; all tracked source file hashes matched the commit inside the test container.
A subsequent category-count singular/plural copy fix received frontend checks
and a fresh production build. No production fixture data was created.

## Community discovery and return visits

Explore uses a compact welcome area, distinct contribution cards and an optional
photo from a visible published method. Topic cards support private saves directly
from the feed. My topics opens the member’s existing topic list; no duplicate
personal dashboard is introduced. `/community/guide` explains the complete flow
with an explicitly illustrative example.

In-app notifications alert a topic owner to a new method and a method author to
someone’s first response. Self-contributions and response edits send no alerts.
Alerts are recipient-only, support read/open actions, and disappear with deleted
or moderated contributions. They send no email. These product additions do not
resolve the operator/contact, legal approval, delivery and recovery checks in
[LAUNCH.md](LAUNCH.md).

## Shared contribution editor

The shared rich-text editor adds paragraphs, basic formatting, links and inline
photos to methods and “I tried this” responses, including the optional first
method in topic creation. Secondary source/date/link fields stay collapsed until
needed. See [RICH-TEXT.md](RICH-TEXT.md) for behavior and validation boundaries.
The local Docker release gate passed on the feature source based on `719dbfd`:
production frontend build, formatting/lint, TypeScript, Pint, PHPStan, 317 tests /
3260 assertions on each of SQLite and PostgreSQL, 13 Python tests and complete
browser flows with 117 screenshots. Relevant editor, inline-photo, mobile and
dark-mode captures were reviewed. The tested source snapshot has SHA-256
`c0f4725b02d4cb755d3e9dabed7a90d1c615403553dc942a0e22d1b4df62ef30`.
Only documentation changed after that snapshot. These isolated results do not
attest production uploads or external-service configuration.

## Current application state

Workbine is deployed at https://workbine.com. The repository baseline now includes
the shared navigation (#39), retry recovery (#37), preserved methods (#36),
connected discovery (#33), rich-text contributions (#30), moderation (#28/#29),
verified accounts (#26), images (#18) and launch support (#20). Repository state,
isolated test evidence and a particular production deployment are separate facts;
use the read-only production verification in [TESTING.md](TESTING.md) when the live
frontend release must be established before another merge. A feature being in
`main` does not by itself establish that the product is ready to invite users.

| Area            | Current behavior                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Community       | Independent topics, practical methods, real experiences and optional evidence.                                                                                            |
| Topic creation  | Publish a topic with a first method or invite approaches without one. Context and the first method are explicitly optional, and drafts survive method toggles/validation. |
| Discovery       | Text search, Needs a method filtering, paginated public content and clearly labelled illustrative starter ideas for an empty/new community.                               |
| Design          | Wider white/neutral-grey/blue layout, shared branded account screens, responsive light and dark interfaces.                                                               |
| Public profiles | `/members/{username}`, explicit public details and contribution lists/counts with clickable impact filters.                                                               |
| Usernames       | One current username per member. Old names are released for reuse; legacy numeric links redirect.                                                                         |
| Images          | Optional profile photos and inline photos in methods and responses; discovery shows an optional photo from a visible method.                                              |
| Architecture    | Laravel/React/Inertia monolith with PostgreSQL, Docker deployment and R2 media storage.                                                                                   |

The disabled media default in `.env.example` is for installations awaiting
configuration; it does not describe the existing deployment. Do not recreate a
bucket, disable working uploads or repeat completed feature work from old branch
notes. Consult [MEDIA.md](MEDIA.md) for behavior and the reusable setup runbook.

## Launch and contribution support

- Email registration supports optional Cloudflare Turnstile, verified in Laravel.
  Registration and password-reset email requests each allow 10 attempts per minute
  per visitor IP, using configured trusted proxies. Browser limit errors preserve
  the form. See [ABUSE-PROTECTION.md](ABUSE-PROTECTION.md) for activation and test
  boundaries; code availability does not establish live widget or edge settings.

- Members can edit their own topics/methods with stable URLs and stale-editor
  protection. Updates retain experience/evidence history.
- Topic saves have private lists and identities, public aggregate counts excluding
  the author, and removal controls. Private saved history is encrypted and cleared
  on logout/account deletion. Saves send no notifications.
- Profile impact links filter contributions, and outcome links lead to the
  underlying experiences. Filtered lists keep full summary counts and the
  member's own experience available independently of pagination.
- Optional OpenAI moderation checks public text and processed images before
  publication. Held submissions and community reports share a private Moderation
  page for configured verified administrators. Provider outages send member submissions to manual review without a violation
  classification. Human decisions, exact-content resubmission and manual publishing suspension reuse the monolith. Existing public
  image URLs require separate removal when necessary. Activation and live provider
  access are separate from code availability. See [MODERATION.md](MODERATION.md).
- Branded HTTP errors cover normal and Inertia visits while preserving status,
  retry headers, JSON responses and local debug behavior.
- Standard Laravel/Fortify email confirmation is sent automatically at email/password
  registration and after an email change. Confirmation is required for contributions
  and saved topics. Browsing, account settings, recovery and deletion remain available.
  Google-created accounts already have a verified address and receive no confirmation.
  Google cannot verify an unrelated local email or silently link an unverified
  password account. Password changes revoke database sessions and invalidate
  authenticated sessions that carry the password-hash marker. Recovery of an
  unverified account also removes previously enrolled login credentials; verified
  accounts retain their additional authentication factors.
- The Resend SDK is included for transactional email delivery. See
  [EMAIL.md](EMAIL.md) for runtime configuration and delivery verification;
  provider credentials and inbox delivery must be checked separately.
- Discovery now uses a non-publishing Continue step, explains what happens next,
  and separates illustrative starter ideas from real community activity. Topic
  context and a first method remain optional, method drafts survive toggling and
  validation, and error summaries/focus make failed submissions recoverable. See
  [UX-CLARITY.md](UX-CLARITY.md).

[LAUNCH.md](LAUNCH.md) records the remaining product decisions and release gates.
Reporting defaults describe fresh installations, not a claim about any
deployment's configuration. Contact/policy approval, a review
owner and external-service/recovery checks remain separate from code validation.

## Working rules for agents

Read [README.md](../README.md), [AGENTS.md](../AGENTS.md), this file,
[DESIGN.md](DESIGN.md), [BACKLOG.md](BACKLOG.md) and [TESTING.md](TESTING.md) before
changing the project. Inspect the current branch, working tree and revision.
Work in feature branches. The owner authorizes tested feature work and merges;
no ZIP deliverables are wanted.

Use `bash tools/test-local.sh` when a usable local Docker runtime is available.
Do not also request GitHub Actions. Without a usable local runner, use the
explicit remote mechanisms in TESTING.md: workflow dispatch or the
`run-remote-checks` same-repository PR label. A push, label or PR does not prove
checks passed. Record the tested source revision and actual results; historical
passing tests do not validate new application changes.

`main` triggers deployment automatically. Observe its result instead of starting
another deploy or restarting services. Use the read-only production smoke when a
live release must be distinguished from a healthy stale frontend. Infrastructure
changes need a concrete explanation and applicable owner authorization. Do not
publish credentials, production environment values, account identifiers,
customer data or private operational notes in files, diffs, test fixtures,
screenshots or PR descriptions.

The historical repository-hosted coding agent and its three-hour cron remain
cancelled; PR #11 removed that schedule. Retained controllers and task files from
that mechanism are historical and inactive. Do not reactivate that GitHub-hosted
workflow or resume its pending branch merely because a separate owner-requested
development session exists. The periodic media cleanup is application maintenance,
not permission for unattended infrastructure changes. Do not publish/promote the
product externally without authorization.

## Product decisions and behavior

The core model remains `Topic -> Methods -> Real experiences -> Evidence -> Reputation`.
Keep one monolith and independent topics, without parent/child topic hierarchies.
The interface should feel like useful advice from people with real experience.
Profiles foreground clickable impact: methods tried, worked/partial outcomes
and topic saves. A secondary, collapsed reputation breakdown uses explicit
weights and support limits; see [REPUTATION.md](REPUTATION.md). Thanks, voting,
leaderboards and ranking changes are not implemented. User outcomes are self-reported, not independently verified claims.

- A topic and its optional first method are saved together in a transaction.
  Topic-only creation receives equal prominence. Draft recovery and a copy-link
  fallback are supported. The discovery composer makes clear that Continue does
  not publish, and illustrative starter prompts can be undone or edited.
- Methods describe practical steps, context and results, with optional source
  attribution. Discovery uses bounded literal search and stable pagination.
- Experiences record positive, partial or negative outcomes, context, an optional
  trial date, external evidence URL and one optional image. Members can update or
  remove their own experience. One experience per member/method, scoped ownership,
  contribution throttling and prevention of author self-validation are enforced.
- Public profiles serialize public fields explicitly. Private email, Google
  identity and security fields are not part of the public profile response.
  Display-name edits do not change usernames. Previous usernames are not aliases
  or reservations and may be taken by another member.
- Custom profile photos are separate from Google avatars and survive later Google
  login. Uploaded avatars appear throughout the community, with initials as a
  fallback. Evidence images remain optional alongside external links.
- Branded Fortify authentication and Profile/Security/Appearance screens include
  password, two-factor, recovery, passkey and account-deletion flows, plus Google
  sign-in integration. Provider-specific login, mail delivery and hardware passkey
  behavior need separate verification for each deployment; code and synthetic
  browser checks alone do not establish external-service configuration.
- The wider interface uses a shell up to 1600px, a generous feed and a supporting
  column. White/light-neutral surfaces, graphite text and restrained blue replace
  the rejected green/olive/terracotta direction. Light/dark layouts were checked
  from 320px through 1920px. Do not invent activity, testimonials or growth claims.

## Operations and verification boundaries

[MEDIA.md](MEDIA.md) documents image validation, WebP processing, quotas, storage,
cache behavior, cleanup and a fresh-install configuration reference. Keep actual
provider/account settings, cost-alert configuration, service inventories and
recovery records outside this public repository. Agents without the private
handoff must not infer those settings from examples or previous test results.

The application provides `media:check` for local configuration validation and
`media:prune` for retrying cleanup. Command availability does not prove scheduling,
provider connectivity, billing notifications or backups. Record deployment-specific
verification privately. Public image caching can retain a previously deleted
image at its old URL until its TTL expires; new uploads receive different keys.

Local tests cover profile/evidence image validation, ownership, replacement,
removal and cleanup. The separate production check covered a profile-photo
upload/remove/upload flow and public R2 delivery. Do not generalize that check to
all production mutation paths. The public production smoke is read-only and can
verify the production-built frontend fingerprint plus selected public behavior;
it does not attest runtime environment values or external providers. Never run
synthetic browser mutation suites against production or commit their
production-derived output.

Tests isolate data, services and credentials. Running them on a shared host still
uses host CPU, memory and disk. A quiet health check is not a load test or a
supported-user estimate. Reassess operational capacity using measurements and the
private handoff, not public documentation snapshots.

Potential product increments are listed in [BACKLOG.md](BACKLOG.md); that list is
not authorization for automatic work. Deployment-specific operational follow-up
belongs in the private handoff and should be confirmed with the owner when absent.

## Completed releases and validation

These are completed application releases, not branches awaiting implementation.
For each release, the recorded gate applies only to the stated source revision.

| Release                       | Result                                                                 | Recorded application validation                                                                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #12, community/account design | Merged; refined by #16/#17/#18.                                        | Historical CI #40 and UI preview #20 on `9a8eddb6ad4f990a336e229f0cad8af1bbab2df1`: 93 application tests, 13 Python tests and 37 screenshots.                                                                                                  |
| #13/#14, HTTPS                | Merged; public HTTPS redirect ownership simplified.                    | See [HTTPS.md](HTTPS.md) and repository history.                                                                                                                                                                                               |
| #15, topic composer/testing   | Merged; optional first method and the local test workflow are shipped. | See repository history and [TESTING.md](TESTING.md).                                                                                                                                                                                           |
| #16, wider community layout   | Merged as `707a40d`; deployed.                                         | Local run on `106d8c95f8749ae22540074fed730be2d8cea325`: 115 tests / 912 assertions on each SQLite and PostgreSQL, 13 Python tests, complete browser flows and 58 screenshots.                                                                 |
| #17, member usernames         | Merged as `b395f09`; deployed.                                         | Local run on `5372ea5c52b1fdb7e0ab90d7ce450c750dab8edf`: 144 tests / 1091 assertions on each database, 13 Python tests, complete browser flows and 62 screenshots.                                                                             |
| #18, images/R2                | Merged as `cfedca2`; deployed.                                         | Local run on `a564866c7c35036830b4b0b01b657a049bcd2cb9`: 166 tests / 1315 assertions on each database, 13 Python tests, existing and media browser flows, 71 screenshots.                                                                      |
| #19, public-safe handoff      | Merged as `9ec573f`; documentation-only release.                       | Repository history; no application behavior change claimed.                                                                                                                                                                                    |
| #20, launch support/impact    | Merged as `23f67d8`.                                                   | Release PR recorded editing, saves, reporting, impact/reputation and security validation; see repository history and [LAUNCH.md](LAUNCH.md).                                                                                                   |
| #21, human-first topic flow   | Merged as `5bfc0d0`.                                                   | CI #49 and Public UI preview #26 on `1aef4c6e6c27cdb8adb415b2fe45f8c8ffa9ee82`: SQLite/PostgreSQL release gates passed; 274 application tests / 2788 assertions in the recorded SQLite job, 13 Python tests, browser flows and 83 screenshots. |

The listed local application runs passed the production frontend build,
formatting/lint, TypeScript, Pint, PHPStan and application suites. The #18
production Dockerfile also built successfully. The #21 remote CI exercised the
same quality categories on both configured databases, while its UI preview ran
browser contribution/account/media flows and the human-first topic regression
checks. Relevant responsive and dark-mode captures were reviewed for the UI
releases. A sticky header partway through a full-page capture can be a capture
artifact; inspect actual scrolling before calling it a layout defect.

Local artifacts are temporary and may be unavailable to another agent. Remote
artifacts expire. For future releases, record fresh checks and separately verify
the deployed result when needed. Read-only smoke checks sample public pages;
absent content means the corresponding detail flow was not exercised.
