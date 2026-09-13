# Workbine development queue

Read README.md, AGENTS.md, docs/STATUS.md and docs/DESIGN.md before choosing work.
Current owner direction: a clean, very light community interface without the green
palette or Laravel starter account screens.

Only explicitly requested development sessions are authorized. The historical
repository-hosted coding agent and its cron remain cancelled; do not recreate that
workflow or resume its inactive automatic branch. A separate owner-requested
session is authorization only for the work and limits stated in that request. No
ZIP deliverables, fake content, automatic external promotion or fabricated growth
metrics.

## Released baseline

As of 2026-09-13, the merged baseline includes #39 (`a0402d9`): shared collapsible
navigation across community/account pages. It also includes method-update retry
recovery (#37), permanent preservation of tried methods (#36), the browser pilot
and coverage inventory (#34/#35), connected discovery (#33), in-app notifications
(#32), rich text and inline photos (#30), moderation/fallback (#28/#29), registration
protection (#27), standard email verification (#26) and Resend support (#25).
Earlier topic creation, search, profiles, saves and reputation remain implemented.

These are completed features, not a queue for another agent. #38 was a duplicate
of #37; only its independent JSON conflict test is retained. The current experience
revision enforcement completes #40's server validation and request fixtures.
Use [STATUS.md](STATUS.md), [BROWSER-FLOWS.md](BROWSER-FLOWS.md) and the current PR
for behavior, remaining coverage and actual validation evidence. The highest
priority browser gaps include full password reset, remaining 2FA/passkey actions,
report/review flows and non-Chromium engines; they are verification work rather
than proof of missing product controls.

A repository merge is not by itself evidence that a particular build is live.
Use the read-only production verification described in [TESTING.md](TESTING.md)
when the live release must be established before further merges.

## Operational work

Deployment-specific account details, recovery status, service checks and capacity
decisions are maintained in the private handoff described in [AGENTS.md](../AGENTS.md).
Read it when available before planning infrastructure work. Public configuration
examples and local tests do not establish provider setup, scheduled-job execution,
notification delivery or recoverability for a particular deployment.

Keep PostgreSQL/media recovery, cleanup scheduling, cost/availability monitoring
and external-service delivery checks in the operational process. Do not publish
private findings or convert this checklist into unattended infrastructure work.

## Launch support already implemented

Owner editing, saved topics with public aggregate counts, clickable profile
impact/outcome filters, a secondary bounded reputation breakdown, opt-in manual
content reporting and branded errors are implemented. Topic creation and discovery
have also been simplified around plain-language guidance, optional context and an
optional first method. See [LAUNCH.md](LAUNCH.md), [UX-CLARITY.md](UX-CLARITY.md)
and [REPUTATION.md](REPUTATION.md) for acceptance criteria and exact behavior.

The latest owner direction favors meaningful, clickable evidence of usefulness
on a profile. A numeric score remains secondary. Do not replace these indicators
with an opaque leaderboard or treat self-reports as independently verified results.

## Next decisions for requested sessions

- Choose public or invitation beta access and approve real contact/operator,
  privacy and terms content before publishing those pages.
- Assign report review responsibility before enabling the report interface.
- Configure and verify transactional delivery before offering email-dependent
  account flows. Standard confirmation protects contributions and saved topics;
  account recovery and deletion remain accessible.
- Revisit recognition for useful experience writers, abuse handling and any
  earned milestones based on observed community use. Do not reward posting volume.
- Keep optional automated moderation within its existing scope; do not add new
  AI features, voting, leaderboards or topic hierarchies merely to make the
  product appear more advanced.
- Prefer small observed usability or reliability obstacles over speculative
  feature expansion.

Follow the environment-selection policy in AGENTS.md and docs/TESTING.md. Read the
latest `main` and existing PRs before changing files. Keep STATUS truthful about
actual validation and limitations. Do not claim measured growth or independent
usability validation based on UI screenshots.
