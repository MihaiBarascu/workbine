---
name: workbine-browser
description: Explore and maintain Workbine browser flows in the isolated local environment, using concise CLI commands and reusable Playwright tests.
---

Read docs/TESTING.md and docs/BROWSER-PILOT.md. Work only in the disposable test
container produced by `bash tools/test-local.sh --browser-server`. Never point
synthetic mutations at production. Keep source changes in a feature branch.

Use the pinned official skill at
`node_modules/@playwright/cli/skills/playwright-cli/SKILL.md` inside that container.
Read it once, then use `node_modules/.bin/playwright-cli` with a named session and
`/tmp/pilot-cli.json`. `tools/browser-cli-config.cjs` creates this local-only
configuration. Prefer `find`, bounded snapshots and semantic locators; inspect
screenshots for appearance and errors. Do not dump full traces or page trees into
context when a specific error and a small excerpt suffice.

Give each model task one scenario, expected outcomes, relevant files and the exact
failing result. Reuse tests/e2e/fixtures.ts; keep tests independent. Prefer roles
and labels; use a narrow technical locator only for controls such as file inputs
and contenteditable editors. Never replace a required check with a skip or remove
an assertion to get a green report. Stop after two unsuccessful repair rounds and
report evidence for review by a more capable model.

After edits in a snapshot-based development container, copy only the changed test
files into that container before re-running. Changes to application source need a
fresh build. Final release validation uses a fresh `bash tools/test-local.sh`
snapshot, never a partly modified development container.

Report exact source, scenarios, projects, executed/skipped/failed counts, duration
and artifacts. Record actual model tokens only if the environment exposes them;
otherwise state unavailable. A CLI output length is not a billing token count.
Luna is a candidate for bounded authoring/maintenance, not the judge of its own
correctness. Ordinary saved test runs use no model tokens.
