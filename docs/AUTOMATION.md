# Workbine coding automation - stopped

Stopped at the owner's explicit request on 2026-09-11. This supersedes the earlier request for development every three hours.

The `continuous-development.yml` workflow is removed from `.github/workflows`, including its cron, manual-dispatch and controller-change push triggers. No replacement coding-agent workflow or schedule is configured by this change.

Do not restore the workflow, rerun historical agent jobs, enable the previous PR-publication prerequisite or treat the old task queue as authorization for unattended work. A new scheduled coding agent requires a new explicit request from the owner.

## Preserved, inactive history

The old controller source, its regression tests, task/progress files and unmerged feature branches are retained to avoid deleting unrelated history or pending work. They are not an active schedule. Existing GitHub Actions run records may remain visible as historical records; their presence is not evidence that the agent is still scheduled.

The last automatically generated candidate is not automatically approved for publication by the shutdown. Do not merge it as part of stopping the agent.

## Unchanged application operations

Ordinary CI, public UI tests, read-only production checks and the existing main-to-Dokploy build/deployment flow remain in place. Stopping the coding agent does not remove existing product features, modify production data or change the owner's Copilot subscription.
