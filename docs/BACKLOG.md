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

As of 2026-09-12, PRs #12–#21 are merged. The repository baseline is `5bfc0d0`
(#21): the wider white/grey/blue community UI, topic creation with or without a
first method, public username profiles, branded account/authentication screens,
optional profile/evidence image uploads, launch-support controls and the
human-first discovery/topic flow are all in `main`.

The #21 release makes the first contribution path clearer: discovery uses a
Continue step rather than implying immediate publication, topic context and the
first method are explicitly optional, starter ideas are labelled as examples,
drafts survive method toggles and validation, and error focus/keyboard behavior
is covered by browser tests. Read [STATUS.md](STATUS.md), [UX-CLARITY.md](UX-CLARITY.md)
and [MEDIA.md](MEDIA.md) before repeating completed work or choosing a new
increment.

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
  account flows. Optional confirmation is implemented; enforced verification is
  a separate decision and must preserve account recovery/deletion access.
- Revisit recognition for useful experience writers, abuse handling and any
  earned milestones based on observed community use. Do not reward posting volume.
- Prefer small observed usability or reliability obstacles over speculative
  feature expansion. In particular, do not add AI, voting, leaderboards or topic
  hierarchies merely to make the product appear more advanced.

Follow the environment-selection policy in AGENTS.md and docs/TESTING.md. Read the
latest `main` and existing PRs before changing files. Keep STATUS truthful about
actual validation and limitations. Do not claim measured growth or independent
usability validation based on UI screenshots.
