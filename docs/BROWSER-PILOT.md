# Browser testing pilot

The pilot uses Playwright Test for repeatable execution and the pinned official
Playwright CLI skill for bounded AI exploration. It extends the existing browser
suite; it does not replace account, moderation, media or recovery coverage.

## Commands and environment

- `bash tools/test-local.sh`: full release gate, including the original six scenarios and the account-flow additions
  on desktop and mobile Chromium.
- `bash tools/test-local.sh --browser`: build a disposable application and run
  the independent browser suite, including subsequently added coverage scenarios.
  This is not the full release gate.
- `bash tools/test-local.sh --browser-server`: leave the disposable application
  running for exploration/repair. Stop this foreground command with Ctrl-C when
  finished; its cleanup removes the Compose services and retains artifacts.

The runner prints the artifact directory and has no published host port. Locate
its test container with `docker ps --format '{{.Names}}'`. For commands below,
replace `TEST_CONTAINER` with that exact disposable checks container, never an
application or deployment container:

```sh
docker exec -e WORKBINE_BROWSER_PILOT=1 -e DB_DATABASE=/tmp/workbine-preview.sqlite TEST_CONTAINER npm run test:browser
docker exec -e WORKBINE_BROWSER_PILOT=1 -e DB_DATABASE=/tmp/workbine-preview.sqlite TEST_CONTAINER npm run test:browser -- --repeat-each=2
docker exec -e WORKBINE_BROWSER_PILOT=1 -e DB_DATABASE=/tmp/workbine-preview.sqlite TEST_CONTAINER npm run test:browser:resilience
docker exec TEST_CONTAINER node_modules/.bin/playwright-cli -s=pilot open http://127.0.0.1:8000/topics --config=/tmp/pilot-cli.json
docker exec TEST_CONTAINER node_modules/.bin/playwright-cli -s=pilot find 'Create topic'
docker exec TEST_CONTAINER node_modules/.bin/playwright-cli -s=pilot close
```

The CLI configuration uses the installed, pinned Chromium executable inside the
isolated container. Read the official skill at
`node_modules/@playwright/cli/skills/playwright-cli/SKILL.md`; project-specific
instructions are in `.agents/skills/workbine-browser/SKILL.md`.

Development containers hold snapshots. Copy a changed test into the container
before rerunning it; application changes need a new build. Always create a fresh
full-gate snapshot for release validation. Server-mode or targeted results are
not substitutes for that gate.

## Independent data and reports

Each test gets three verified synthetic accounts, one topic and one method through
`tests/e2e/seed.php`; its unique accounts are removed in teardown. The fixture
checks application environment, database path, application origin and an explicit
pilot flag. Each test uses fresh browser contexts. Tests use one worker: repeated two-worker runs exposed SQLite write-lock
failures. Keep runs sequential in each disposable container. Parallel execution
requires independent databases/servers first. Account
creation in this fixture is setup, not proof of registration or email delivery.

Playwright Test 1.56.1 matches the existing browser image. Playwright CLI 0.1.19
is pinned separately for exploration. Lockfile changes and browser upgrades should
be evaluated together, not fetched as unpinned latest tools during each run.

The baseline emits HTML and JSON reports under
`/tmp/workbine-ui-preview/pilot-baseline/`, with screenshots and traces retained
on failures. Successful reports include per-test durations and project labels.
Retries are zero and focused tests (`test.only`) are forbidden. A failed test
stays failed; it is not silently healed or skipped.

## Pilot quality checks

The resilience command applies browser-local CSS changes to card arrangement and
controls, then deliberately injects three faults: an aborted save, an aborted
publication, and a denial returned with an incorrect success status. It requires
all six scenarios to pass the cosmetic variation and each targeted fault to fail
its corresponding assertion. Reports must contain the expected test count, no
skips/global errors and evidence that the fault interception actually occurred.
Expected failures have separate reports and never count as passing application
tests. This checks selected test sensitivity, not exhaustive mutation coverage or
proof that every redesign will require zero maintenance.

## Coverage inventory

| Flow                                                               | Independent pilot     | Existing browser suite / remaining boundary                                   |
| ------------------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------- |
| Verified login/logout                                              | Yes                   | Registration/verification and partial reset/2FA checks remain in legacy suite |
| Topic-only publication, category, tags                             | Yes                   | Legacy suite retains draft/validation/empty-state cases                       |
| First method, rich text, inline photo and persisted delivery       | Yes                   | Legacy media suite retains invalid/replaced/deleted uploads                   |
| Second member experience, persistence, recipient notification/open | Yes                   | Legacy suite retains experience edits/removal and notification states         |
| Search/category, save/unsave and persistence                       | Yes                   | Tag/sort/people/pagination and appreciations remain in legacy suite           |
| Owner edit plus non-owner denial                                   | Yes                   | Legacy suite retains conflicts and broader contribution permissions           |
| Moderation and reports                                             | Not migrated          | Existing isolated browser suite; external provider outcomes simulated         |
| Profile/settings/deletion                                          | Not migrated          | Legacy suite plus account scenarios in `coverage.spec.ts`                     |
| Google, hardware passkeys, actual inbox and remote storage         | Not attested by pilot | Separate controlled integration/device verification required                  |
| Firefox/WebKit and physical mobile devices                         | Not in pilot          | Next increment after measuring this runner; mobile Chromium is emulation      |

See [BROWSER-FLOWS.md](BROWSER-FLOWS.md) for the action-level inventory and
additional scenarios beyond the original pilot. The resilience benchmark stays
scoped to the original six tests in `flows.spec.ts`.

The matrix records scope rather than an invented percentage of all possible
flows. New user-facing features must add their scenarios and explicit gaps here.

## Luna evaluation

GPT-5.6-Luna was assigned this six-scenario authoring task at medium reasoning.
The initial desktop run passed 3/6; repair rounds reached 4/6 then 6/6. The model's
final desktop/mobile run passed 12/12 in approximately 26.5 seconds (browser run,
not total authoring time). Failures involved assumptions about visible tags,
selecting the editor image before changing its description, and duplicate
notification links. Root supplied the runner/fixtures and clarified the fixture
contract; this was not an autonomous from-scratch benchmark.

Review then strengthened exact category values, image load checks, experience
persistence/notification opening, contextual selectors and cleanup. Final
reviewed single-worker repetition passed 36/36 (three desktop/mobile repetitions)
in 125.5 seconds, with zero retries, skips or flaky results. Two-worker repetition
had exposed actual SQLite lock errors; the smaller sequential configuration is
the maintained default. Full-gate validation is recorded in the release evidence.
Token usage for the
Luna sub-agent is not exposed by this session's orchestration interface; no API
cost, token savings percentage or comparison against other models is claimed.
Ordinary saved test execution makes no model calls. Continue using Luna for
bounded drafts with a review step, and escalate after two unsuccessful repair
rounds. Treat this small pilot as initial evidence, not a universal model ranking.

References: [Playwright best practices](https://playwright.dev/docs/best-practices),
[parallelism](https://playwright.dev/docs/test-parallel),
[CLI with Skills](https://github.com/microsoft/playwright-cli),
[OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
