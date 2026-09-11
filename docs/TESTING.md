# Workbine testing

## Choose by capability, not by client name

Use `bash tools/test-local.sh` when a usable local Docker/Compose runtime is
available. Do not also request GitHub Actions for the same work. When there is no
usable local runner, explicitly request remote checks by workflow dispatch or the
PR-label mechanism below. Diagnose a temporarily broken local runner first and
explain the blocker before using the remote fallback.

Pushes do not identify the authoring client. No commit-message keyword, author
name or branch naming convention selects the runner. Ordinary pushes, PR creation
and PR synchronization do not start tests. The owner-requested remote alternative
is an explicit `run-remote-checks` label event, not unattended development.

## On this machine

Run `bash tools/test-local.sh` from the repository root. Docker with Compose is the
only host runtime prerequisite. The first run builds the PHP 8.3 / Node 24 /
Playwright image; later runs reuse image layers and dependency download caches.

The runner snapshots tracked and non-ignored untracked files, including
uncommitted changes, into a temporary directory. Ignored `.env`, vendor,
node_modules and generated assets are excluded. It installs locked dependencies,
builds the frontend, checks formatting/lint, TypeScript, Pint and PHPStan, runs the
Python checks and application tests against SQLite and PostgreSQL 16, then runs
the public screenshot and contribution/account browser flows.

All application files, database state and the browser server stay in disposable
containers. No ports are published, no Dokploy containers are reused, and no
production environment values are loaded. PostgreSQL uses temporary memory-backed
storage. Containers and the private Compose network are removed at exit.
Dedicated Composer/npm download caches remain for reuse. Logs and review
screenshots remain in the printed `/tmp/workbine-local-tests.*/` directory. These
are local test artifacts, not product uploads.

A successful run for the current changes is the release gate. Rerun the relevant
checks after fixes. Review screenshots for UI changes. Merge the tested branch
normally; Dokploy automatically deploys `main`. Observe the live result without
starting a second deployment.

## GPT Web without a local runner

### Workflow dispatch

Explicitly dispatch `ci.yml` and `ui-preview.yml` for the feature branch:

```sh
gh workflow run ci.yml --ref YOUR_BRANCH
gh workflow run ui-preview.yml --ref YOUR_BRANCH
```

The same actions are available in GitHub Actions → workflow → Run workflow →
select branch. A connected tool can use the workflow dispatch API when supported.
The workflow definitions must exist on main before this option is available.

### Explicit PR-label request

When the connector can manage PR labels but cannot dispatch a new workflow, add
`run-remote-checks` to the same-repository feature PR. This starts both existing
workflows through `pull_request: types: [labeled]`, including on a draft PR.

- Only adding that exact label requests checks. Other labels skip the test jobs.
- Fork PRs are excluded. Jobs retain `contents: read`, do not persist checkout
  credentials and use isolated test services, not production settings or data.
- Checkout is pinned to `github.event.pull_request.head.sha`. Each job records
  the actual checked-out revision in its log and job summary.
- Keeping the label on a PR does not request checks for subsequent pushes. After
  fixes, remove the label and add it again to test the new head. Do not reuse old
  green checks or rerun an old revision as evidence for new changes.
- Adding a different label cannot cancel the requested run: concurrency groups
  include the triggering label. There is no push, schedule, auto-merge or deploy
  trigger in these checks.

For example, use the connector's remove/add label actions or an authenticated CLI:

```sh
gh pr edit PR_NUMBER --repo MihaiBarascu/workbine --add-label run-remote-checks
# For a new source revision after the first request:
gh pr edit PR_NUMBER --repo MihaiBarascu/workbine --remove-label run-remote-checks
gh pr edit PR_NUMBER --repo MihaiBarascu/workbine --add-label run-remote-checks
```

This is a maintained alternative for owner-requested remote testing, not a
temporary workflow to commit and remove. Do not introduce general push-triggered
workflows to work around a missing tool. Remote checks consume Actions usage;
choose one remote request method and do not also run the full local suite.

`production-smoke.yml` remains an optional, manually dispatched read-only live
check. The historical bootstrap workflow is not a test command. Do not invoke it
for ordinary development. No cron or unattended coding agent is enabled.

References: [GitHub manual workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
and [pull request label events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).

## Instructions for agents without shell execution

1. Make the requested changes on a feature branch through the available tools.
2. Request both remote workflows using dispatch or the explicit label. If neither
   operation is available, ask the owner to start the workflows for that branch.
3. Inspect both runs to completion. CI must pass SQLite and PostgreSQL; UI preview
   must pass browser flows. Compare the runs' head SHA and recorded source with
   the current PR head. Review UI artifacts before merging interface changes.
4. Fix failures on the branch and request fresh checks for the new revision.
   A previous commit's green checks do not validate later changes.
5. Merge only after current results pass. `main` deploys automatically; do not
   invoke deployment manually or run synthetic mutations against production.

## Handoff between environments

Report the branch/commit, whether uncommitted changes were included, the actual
checks and results, and where logs/screenshots are available. For local runs,
retain the printed temporary directory; for remote runs, link the run IDs.
Describe remaining blockers or coverage limitations. Inspect current source
before reusing earlier results. A push, label or PR alone is never proof of a
successful test run.

Live health and deployment confirmation are separate from the isolated suite.
Read-only checks may run after Dokploy deploys. Never run the synthetic browser
mutation scripts against workbine.com.
