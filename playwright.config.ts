import { defineConfig } from '@playwright/test';
if (
    process.env.APP_ENV !== 'testing' ||
    process.env.WORKBINE_BROWSER_PILOT !== '1' ||
    process.env.DB_DATABASE !== '/tmp/workbine-preview.sqlite'
) {
    throw new Error(
        'Run through bash tools/test-local.sh --browser; no production browser mutations.',
    );
}
const variant = process.env.WORKBINE_PILOT_VARIANT ?? 'baseline';
if (
    ![
        'baseline',
        'layout',
        'broken-save',
        'broken-publish',
        'broken-ownership',
    ].includes(variant)
)
    throw new Error('Unknown pilot variant');
const artifacts = `/tmp/workbine-ui-preview/pilot-${variant}`;
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: true,
    // The disposable preview shares SQLite; parallel writers cause lock failures.
    workers: 1,
    retries: 0,
    timeout: 45_000,
    expect: { timeout: 8_000 },
    outputDir: `${artifacts}/results`,
    reporter: [
        ['list'],
        [
            'html',
            {
                outputFolder: `${artifacts}/report`,
                open: 'never',
            },
        ],
        ['json', { outputFile: `${artifacts}/results.json` }],
    ],
    use: {
        baseURL: 'http://127.0.0.1:8000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        contextOptions: { reducedMotion: 'reduce' },
        actionTimeout: 10_000,
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: {
                browserName: 'chromium',
                viewport: { width: 1440, height: 900 },
            },
        },
        {
            name: 'chromium-mobile',
            use: {
                browserName: 'chromium',
                viewport: { width: 375, height: 812 },
                isMobile: true,
                hasTouch: true,
            },
        },
    ],
});
