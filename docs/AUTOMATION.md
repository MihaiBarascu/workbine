# Three-hour Workbine development

## What is scheduled

`.github/workflows/continuous-development.yml` is configured for `17 */3 * * *` in UTC: 00:17, 03:17, 06:17, 09:17, 12:17, 15:17, 18:17 and 21:17. It also supports manual workflow dispatch and an initial run when its controller/configuration changes on main. GitHub schedules can be delayed; this is not a guarantee of an exact start time or continuous availability.

This is a real GitHub-hosted coding workflow, not a reminder and not a promise that a chat session will reopen. It uses the verified GitHub Copilot CLI 1.0.83 with model auto and the built-in workflow token. It selects one reviewed task from `docs/AUTODEV_TASKS.json`. The owner rejected generic SaaS styling; README, AGENTS, STATUS, DESIGN and BACKLOG are included in the coding instructions.

## Scope and gates

The model receives a read-only repository token plus Copilot request permission, a copied workspace without .git, and only file read/edit/search tools. It does not get a repository write token, production credentials, a shell, GitHub MCP tools or network tools.

A deterministic controller rejects additions/deletions, symlinks, changes outside eight existing public-UI files, more than five changed files, excessive diffs, and newly introduced external/executable interaction patterns. These are defense-in-depth checks, not proof that arbitrary generated code is correct or safe.

A separate publisher rechecks the proposal and writes only `automation/workbine-continuation`. The normal CI is reused against the exact proposed SHA on both SQLite and PostgreSQL. The normal Chromium contribution workflow is also reused. Tests and workflow definitions cannot be modified by the coding agent.

Only after both checks pass can the publisher create a PR and request a merge of the exact checked head. Required repository protections still apply. Draft PRs and stylesheet changes require human review. New data models, dependencies, authentication, billing, infrastructure and other changes outside this narrow UI scope are not autonomous tasks.

One pending development branch is reused. Failed checks, a moved main branch, a diverged branch or a publication-permission error do not cause force pushes or direct writes to production. Pending publication is retried on later cycles without generating duplicate work or consuming additional model credits. A persistent code/test failure still needs review; the workflow does not falsely claim to fix every possible failure unattended.

Progress in a feature branch is proposed. It represents delivered work only after merge. When the approved queue is complete, the schedule reports that state without inventing features or repeatedly redesigning finished pages. Add genuinely needed, reviewed UI tasks to extend the queue.

## Permissions and current activation prerequisite

A genuine model probe returned READY. A separate automatic PR-creation probe returned `GitHub Actions is not permitted to create or approve pull requests`.

The owner must enable **Settings -> Actions -> General -> Workflow permissions -> Allow GitHub Actions to create and approve pull requests**. Do not bypass that policy by pushing generated code directly to main. Until publication succeeds in a real cycle, describe the schedule/generation separately from fully automatic release.

No extra API key is required for the model access already tested. Copilot usage follows the account's entitlement and billing. Each generation is limited to a six-minute process and a soft 30-AI-credit response limit; the CLI limit is not a hard monetary cap. There is at most one generation at a time, not an unlimited autopilot loop.

## Controls

Set repository variable `WORKBINE_AUTODEV_PAUSED` to `true` to pause new cycles, or disable the workflow in Actions. Set `WORKBINE_AUTODEV_AUTO_MERGE` to `false` to keep all validated increments as PRs for human review. Defaults follow the owner's explicit authorization to merge tested safe changes.

See the workflow run summary for the selected task, branch, checks, PR or concrete blocking error. No ZIP deliverables are sent to the owner. Internal JSON proposal and browser screenshot artifacts exist only for pipeline transfer/audit.

A validated merge triggers the configured Dokploy flow. Because bot-token pushes do not reliably trigger further Actions, the controller explicitly dispatches the main CI and read-only production smoke after merging. Those are availability checks, not an exact deployed-commit fingerprint or a real Google OAuth session. Never equate an attempted merge with confirmed deployment.
