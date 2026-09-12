# Workbine status

Last updated: 2026-09-12.

This is a public repository. This handoff records product behavior, completed
releases and development rules. Account details, server inventories, operational
check results, customer activity and recovery arrangements belong in the private
handoff described in [AGENTS.md](../AGENTS.md), not in public commits or PRs.

## Current application state

Workbine is deployed at https://workbine.com. The repository baseline now includes
the wider layout (#16), member usernames (#17), R2 image integration (#18), launch
support (#20) and the human-first discovery/topic flow (#21). Repository state,
isolated test evidence and a particular production deployment are separate facts;
use the read-only production verification in [TESTING.md](TESTING.md) when the live
frontend release must be established before another merge. A feature being in
`main` does not by itself establish that the product is ready to invite users.

| Area            | Current behavior                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Community       | Independent topics, practical methods, real experiences and optional evidence.                                                                                |
| Topic creation  | Publish a topic with a first method or invite approaches without one. Context and the first method are explicitly optional, and drafts survive method toggles/validation. |
| Discovery       | Text search, Needs a method filtering, paginated public content and clearly labelled illustrative starter ideas for an empty/new community.                  |
| Design          | Wider white/neutral-grey/blue layout, shared branded account screens, responsive light and dark interfaces.                                                   |
| Public profiles | `/members/{username}`, explicit public details and contribution lists/counts with clickable impact filters.                                                   |
| Usernames       | One current username per member. Old names are released for reuse; legacy numeric links redirect.                                                             |
| Images          | Optional profile photos and one image per experience. Production uploads are enabled; R2 delivery and a profile upload/remove/upload flow have been verified. |
| Architecture    | Laravel/React/Inertia monolith with PostgreSQL, Docker deployment and R2 media storage.                                                                       |

The disabled media default in `.env.example` is for installations awaiting
configuration; it does not describe the existing deployment. Do not recreate a
bucket, disable working uploads or repeat completed feature work from old branch
notes. Consult [MEDIA.md](MEDIA.md) for behavior and the reusable setup runbook.

## Launch and contribution support

- Members can edit their own topics/methods with stable URLs and stale-editor
  protection. Updates retain experience/evidence history.
- Topic saves have private lists and identities, public aggregate counts excluding
  the author, and removal controls. Private saved history is encrypted and cleared
  on logout/account deletion. Saves send no notifications.
- Profile impact links filter contributions, and outcome links lead to the
  underlying experiences. Filtered lists keep full summary counts and the
  member's own experience available independently of pagination.
- Reports can be enabled after a reviewer adopts the private console queue.
  Manual hiding/restoration preserves history and hides descendants from public
  pages. Existing public image URLs require separate removal when necessary.
  See [MODERATION.md](MODERATION.md).
- Branded HTTP errors cover normal and Inertia visits while preserving status,
  retry headers, JSON responses and local debug behavior.
- Optional email confirmation is controlled by
  `COMMUNITY_EMAIL_VERIFICATION_ENABLED` (default false). It exposes manual resend
  once delivery is configured; ordinary contribution access remains unchanged.
  Google cannot verify an unrelated local email or silently link an unverified
  password account. Password changes revoke database sessions and invalidate
  authenticated sessions that carry the password-hash marker. Recovery of an
  unverified account also removes previously enrolled login credentials; verified
  accounts retain their additional authentication factors.
- Discovery now uses a non-publishing Continue step, explains what happens next,
  and separates illustrative starter ideas from real community activity. Topic
  context and a first method remain optional, method drafts survive toggling and
  validation, and error summaries/focus make failed submissions recoverable. See
  [UX-CLARITY.md](UX-CLARITY.md).

[LAUNCH.md](LAUNCH.md) records the remaining product decisions and release gates.
Reporting and email-verification defaults describe fresh installations, not a
claim about any deployment's configuration. Contact/policy approval, a review
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

| Release                       | Result                                                                 | Recorded application validation |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------- |
| #12, community/account design | Merged; refined by #16/#17/#18.                                        | Historical CI #40 and UI preview #20 on `9a8eddb6ad4f990a336e229f0cad8af1bbab2df1`: 93 application tests, 13 Python tests and 37 screenshots. |
| #13/#14, HTTPS                | Merged; public HTTPS redirect ownership simplified.                    | See [HTTPS.md](HTTPS.md) and repository history. |
| #15, topic composer/testing   | Merged; optional first method and the local test workflow are shipped. | See repository history and [TESTING.md](TESTING.md). |
| #16, wider community layout   | Merged as `707a40d`; deployed.                                         | Local run on `106d8c95f8749ae22540074fed730be2d8cea325`: 115 tests / 912 assertions on each SQLite and PostgreSQL, 13 Python tests, complete browser flows and 58 screenshots. |
| #17, member usernames         | Merged as `b395f09`; deployed.                                         | Local run on `5372ea5c52b1fdb7e0ab90d7ce450c750dab8edf`: 144 tests / 1091 assertions on each database, 13 Python tests, complete browser flows and 62 screenshots. |
| #18, images/R2                | Merged as `cfedca2`; deployed.                                         | Local run on `a564866c7c35036830b4b0b01b657a049bcd2cb9`: 166 tests / 1315 assertions on each database, 13 Python tests, existing and media browser flows, 71 screenshots. |
| #19, public-safe handoff      | Merged as `9ec573f`; documentation-only release.                       | Repository history; no application behavior change claimed. |
| #20, launch support/impact    | Merged as `23f67d8`.                                                    | Release PR recorded editing, saves, reporting, impact/reputation and security validation; see repository history and [LAUNCH.md](LAUNCH.md). |
| #21, human-first topic flow   | Merged as `5bfc0d0`.                                                    | CI #49 and Public UI preview #26 on `1aef4c6e6c27cdb8adb415b2fe45f8c8ffa9ee82`: SQLite/PostgreSQL release gates passed; 274 application tests / 2788 assertions in the recorded SQLite job, 13 Python tests, browser flows and 83 screenshots. |

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
