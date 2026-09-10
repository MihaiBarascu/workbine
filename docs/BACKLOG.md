# Workbine development queue

Read README.md, AGENTS.md, docs/STATUS.md and docs/DESIGN.md before choosing work.

Owner direction: a distinctive real community, not a generic SaaS template. Continue in small tested increments. No ZIP deliverables, fake content, automatic external promotion or fabricated growth metrics.

## Current release queue

- [ ] Release the community-notebook identity and useful question composer after full CI and browser review.
- [ ] Verify and configure a real scheduled coding agent every three hours. A cron without working model authentication is not an active development agent.

## Next useful increments

- [ ] Preserve the new identity across public reading, creation and authentication entry points without changing authentication security.
- [ ] Add accessible copy-link fallback coverage and keyboard navigation coverage to the browser tests.
- [ ] Improve empty-search recovery by carrying the search phrase into a new question draft.
- [ ] Implement safe ownership-based editing of a user's own topic/method, with tests and without erasing experience history unexpectedly.
- [ ] Design an opt-in follow/save mechanism that gives members a reason to return. Do not send email or add tracking without an explicit delivery/privacy design.
- [ ] Introduce a small content-reporting workflow when a safe operational review route exists; do not build a generic administration suite.

## Rules for recurring work

Choose one bounded item per cycle. Read the latest main and any existing development PR first. Continue an existing incomplete item rather than creating duplicate PRs. Keep a short handoff in STATUS, with actual tests and unresolved limitations. Do not mark an item done merely because code was generated.

No changes to secrets, billing, deployment credentials, Cloudflare protection, authentication authorization, dependencies or destructive database migrations by an unattended visual-improvement task. Never weaken tests to obtain a green build. Do not publish generated content or claim user growth.
