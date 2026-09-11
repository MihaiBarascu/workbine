# Workbine testing

## Choose by capability, not by client name

| Available environment                                      | Required path                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| This server or another usable local Docker/Compose runtime | Run the local suite; do not dispatch GitHub Actions too.                          |
| GPT Web or another session without an execution runtime    | Explicitly dispatch the GitHub checks for the feature branch.                     |
| Local runtime temporarily broken                           | Diagnose locally first; explain the blocker before falling back to remote checks. |

Pushes do not identify the authoring client. No commit-message keyword, author name or branch naming convention selects the runner. No tests start implicitly from push/PR events.

## On this machine

Run `bash tools/test-local.sh` from the repository root. Docker with Compose is the only host runtime prerequisite. The first run builds the PHP 8.3 / Node 24 / Playwright image; later runs reuse image layers and dependency download caches.

The runner snapshots tracked and non-ignored untracked files, including uncommitted changes, into a temporary directory. Ignored `.env`, vendor, node_modules and generated assets are excluded. It installs locked dependencies, builds the frontend, checks formatting/lint, TypeScript, Pint and PHPStan, runs the Python checks and application tests against SQLite and PostgreSQL 16, then runs the public screenshot and contribution/account browser flows.

All application files, database state and the browser server stay in disposable containers. No ports are published, no Dokploy containers are reused, and no production environment values are loaded. PostgreSQL uses temporary memory-backed storage. Containers and the private Compose network are removed at exit. Dedicated Composer/npm download caches remain for reuse. Logs and review screenshots remain in the printed `/tmp/workbine-local-tests.*/` directory. These are local test artifacts, not product uploads.

A successful run for the current changes is the release gate. Rerun the relevant checks after fixes. Review screenshots for UI changes. Merge the tested branch normally; Dokploy automatically deploys `main`. Observe the live result without starting a second deployment.

## GPT Web without a local runtime

GitHub Actions do not start on push or pull requests. Explicitly dispatch `ci.yml` and `ui-preview.yml` for the feature branch, then inspect their results for the current head before merging:

```sh
gh workflow run ci.yml --ref YOUR_BRANCH
gh workflow run ui-preview.yml --ref YOUR_BRANCH
```

The same actions are available in GitHub Actions → workflow → Run workflow → select branch. A connected tool can use the GitHub workflow dispatch API when supported. The workflow definitions must exist on main before this option is available. Remote checks consume Actions usage; do not dispatch them when working with the local runtime on this machine. GitHub cannot reliably infer which client authored a push, so the choice is explicit.

`production-smoke.yml` is an optional, manually dispatched read-only live check. The historical bootstrap workflow is retained as manual history and is not a test command. Do not invoke it for ordinary development. No cron or unattended coding agent is enabled.

Reference: [GitHub manual workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Instructions for agents without shell execution

1. Make the requested changes on a feature branch through the available GitHub tools.
2. If a workflow-dispatch tool is available, start `ci.yml` and `ui-preview.yml` with `ref` set to that branch. REST equivalent: `POST /repos/MihaiBarascu/workbine/actions/workflows/ci.yml/dispatches` with `{"ref":"YOUR_BRANCH"}`, then the same request for `ui-preview.yml`.
3. If the connector cannot dispatch workflows, tell the user precisely which branch to select in [CI](https://github.com/MihaiBarascu/workbine/actions/workflows/ci.yml) and [Public UI preview](https://github.com/MihaiBarascu/workbine/actions/workflows/ui-preview.yml). Do not substitute temporary workflow commits, automatic push triggers, or assertions that tests passed.
4. Inspect both runs to completion. CI must pass SQLite and PostgreSQL; UI preview must pass browser flows. Compare the runs' head SHA with the current PR head, and review the UI artifacts when changing the interface. A previous commit's green checks do not validate later changes.
5. Fix failures on the branch and dispatch again only when there is a new reason to test. Merge only after current results pass. Dokploy deploys automatically from `main`; do not invoke deployment manually.

## Handoff between environments

Report the branch/commit, whether uncommitted changes were included, which checks actually ran, their result, and where logs/screenshots are available. For local runs, retain the printed temporary directory; for remote runs, link the run IDs. Describe any remaining blocker or coverage limitation. New agents must inspect the current working tree and revision before reusing earlier results.

Live health and deployment confirmation are separate from the isolated test suite. Read-only checks may run from the local environment after Dokploy deploys. Never run the synthetic browser mutation scripts against workbine.com.
