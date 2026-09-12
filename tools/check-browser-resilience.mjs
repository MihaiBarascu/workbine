import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
if (
    process.env.WORKBINE_BROWSER_PILOT !== '1' ||
    process.env.APP_ENV !== 'testing'
)
    throw new Error('Use the isolated browser server.');
const cases = [
    { variant: 'layout', grep: undefined, expected: 6, broken: false },
    {
        variant: 'broken-save',
        grep: 'member can filter, save',
        expected: 1,
        broken: true,
    },
    {
        variant: 'broken-publish',
        grep: 'member can create a topic',
        expected: 1,
        broken: true,
    },
    {
        variant: 'broken-ownership',
        grep: 'only the owner can edit',
        expected: 1,
        broken: true,
    },
];
const results = [];
for (const item of cases) {
    const args = [
        'node_modules/@playwright/test/cli.js',
        'test',
        'tests/e2e/flows.spec.ts',
        '--project=chromium-desktop',
    ];
    if (item.grep) args.push('--grep', item.grep);
    const run = spawnSync(process.execPath, args, {
        env: { ...process.env, WORKBINE_PILOT_VARIANT: item.variant },
        stdio: 'inherit',
    });
    if (run.error || run.signal)
        throw new Error(`Runner did not finish: ${item.variant}`);
    const report = JSON.parse(
        readFileSync(
            `/tmp/workbine-ui-preview/pilot-${item.variant}/results.json`,
            'utf8',
        ),
    );
    const specs = [];
    function walk(suites) {
        for (const suite of suites ?? []) {
            specs.push(...(suite.specs ?? []));
            walk(suite.suites);
        }
    }
    walk(report.suites);
    const tests = specs.flatMap((spec) => spec.tests);
    const assertionFailure = tests.every((test) =>
        test.results.some((result) =>
            result.errors?.some((error) =>
                /expect\(|locator\.click|toHaveURL|toBeVisible/.test(
                    error.message ?? '',
                ),
            ),
        ),
    );
    const valid =
        tests.length === item.expected &&
        report.errors.length === 0 &&
        report.stats.skipped === 0 &&
        report.stats.flaky === 0 &&
        (item.broken
            ? run.status === 1 &&
              report.stats.unexpected === item.expected &&
              tests.every((test) =>
                  test.annotations?.some(
                      (annotation) =>
                          annotation.type === 'injected-fault' &&
                          annotation.description === item.variant,
                  ),
              ) &&
              assertionFailure
            : run.status === 0 &&
              report.stats.expected === item.expected &&
              report.stats.unexpected === 0);
    results.push({
        ...item,
        valid,
        durationMs: report.stats.duration,
        unexpected: report.stats.unexpected,
    });
    if (!valid)
        throw new Error(
            `Resilience check failed or failed for an unrelated reason: ${item.variant}`,
        );
}
writeFileSync(
    '/tmp/workbine-ui-preview/pilot-resilience.json',
    JSON.stringify(results, null, 2),
);
console.log(
    'PASS cosmetic UI change and three explicitly injected browser faults. This is not exhaustive mutation coverage.',
);
