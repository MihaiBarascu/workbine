# Workbine development queue

Read README.md, AGENTS.md, docs/STATUS.md and docs/DESIGN.md before choosing work.

Owner direction: a distinctive real community, not a generic SaaS template. Continue in small tested increments during explicitly requested development sessions. No ZIP deliverables, fake content, automatic external promotion or fabricated growth metrics.

## Current release status

The community-notebook identity and question composer were released through PR #8.

The owner cancelled unattended development on 2026-09-11 and requested removal of the three-hour cron. The coding workflow is removed. Do not recreate the agent, rerun its historical jobs or resume its pending branch unless newly and explicitly requested. The former automatic task queue is historical, not permission to continue autonomously.

## Next useful increments for requested sessions

- [ ] Preserve the new identity across public reading, creation and authentication entry points without changing authentication security.
- [ ] Add accessible copy-link fallback coverage and keyboard navigation coverage to the browser tests.
- [ ] Implement safe ownership-based editing of a user's own topic/method, with tests and without erasing experience history unexpectedly.
- [ ] Design an opt-in follow/save mechanism that gives members a reason to return. Do not send email or add tracking without an explicit delivery/privacy design.
- [ ] Introduce a small content-reporting workflow when a safe operational review route exists; do not build a generic administration suite.

## Development rules

Read the latest main and any existing development PR first. Keep a short handoff in STATUS, with actual tests and unresolved limitations. Do not mark an item done merely because code was generated. Never weaken tests to obtain a green build. Do not publish generated content or claim user growth.

The existing application, CI and Dokploy deployment are not being stopped. Only the unattended coding-agent workflow and its schedule are removed.
