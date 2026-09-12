# Preparing a Workbine beta

The first release should let a member discover a topic, contribute a practical
method, return to update it, and share an honest experience with optional evidence.
A beta does not need leaderboards, a recommendation engine or an admin suite.
Profiles foreground clickable evidence of usefulness; see [REPUTATION.md](REPUTATION.md).

## Product acceptance

- Discover and search public topics; start one with or without a first method.
- Sign in and recover access; manage a public profile and private account settings.
- Publish methods and experiences, including sources and optional evidence images.
- Edit your own topics and methods without changing links or erasing experiences.
  Stale editors must show a conflict rather than overwrite a newer contribution.
- Save topics to a private, removable list. Saving sends no email or notification
  and does not change the topic's visibility. Visitors can see aggregate saves
  from other members; saver identities stay private. An author's own bookmarks
  do not contribute to the public count. Profiles show totals across visible
  topics. These public counts are distinct from the bounded reputation calculation.
- Recover from missing pages, expired sessions, rate limits and service errors.
- Offer content reporting only with an assigned reviewer and a working review path.
  See [MODERATION.md](MODERATION.md).

## Decisions needed before inviting users

The owner chooses public access or an invitation beta, identifies the public
operator/contact details, and approves the terms and privacy information that
reflect actual product behavior and retention. Do not invent an operator, contact
address, legal commitments or retention period in the interface.

Password recovery and email verification need end-to-end delivery checks for the
chosen deployment. Standard Laravel/Fortify confirmation is automatic at
email/password registration and after email changes. The `verified` middleware
protects contributions and saved topics; account management and recovery remain
accessible. See [EMAIL.md](EMAIL.md). Do not infer successful mail delivery from
framework configuration or mocked tests.

Reporting defaults off (`COMMUNITY_REPORTS_ENABLED=false`). An assigned reviewer
must adopt the review procedure before it is enabled. The interface does not
promise an email response or a review deadline.

Recovery, monitoring and external-service readiness are deployment checks. Keep
actual findings, accounts, backup locations, contact decisions and operational
records in the private handoff described in [../AGENTS.md](../AGENTS.md), outside
this public repository. Use an isolated restore exercise for recovery validation.

## Release acceptance

Run [the local gate](TESTING.md) for the final source revision, including the
launch browser flow. Review mobile and dark screenshots, record actual checks
and outcomes, and observe the normal deployment after merge. A passing synthetic
suite does not establish legal approval, email delivery, moderation staffing or
production recoverability. Do not call a beta ready while these decisions and
checks remain open.
