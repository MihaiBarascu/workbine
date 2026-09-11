// Only the disposable preview server; no production writes.
const { createRequire } = require('node:module');
const { mkdir } = require('node:fs/promises');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    const browser = await chromium.launch();
    const output = '/tmp/workbine-ui-preview';
    await mkdir(output, { recursive: true });
    try {
        for (const [path, name, width, colorScheme, selector] of [
            ['/topics', 'topics-desktop', 1440, 'light', 'main article'],
            ['/topics', 'topics-mobile', 375, 'light', 'main article'],
            [
                '/topics/preview-first-customer',
                'method-desktop',
                1440,
                'light',
                'main article',
            ],
            [
                '/topics/preview-first-customer',
                'method-mobile',
                375,
                'light',
                'main article',
            ],
            [
                '/topics/preview-first-customer',
                'method-mobile-dark',
                375,
                'dark',
                'main article',
            ],
            [
                '/topics/preview-unanswered',
                'topic-without-methods-mobile',
                375,
                'light',
                '#methods-heading',
            ],
            [
                '/topics?view=unanswered',
                'unanswered-feed-mobile',
                375,
                'light',
                'main article',
            ],
        ]) {
            const page = await browser.newPage({
                viewport: { width, height: width === 1440 ? 1080 : 812 },
                colorScheme,
            });
            const response = await page.goto('http://127.0.0.1:8000' + path);
            if (!response?.ok()) {
                throw new Error(`${path} returned HTTP ${response?.status()}`);
            }
            await page.locator(selector).first().waitFor();
            await page.screenshot({
                path: `${output}/${name}.png`,
                fullPage: true,
                animations: 'disabled',
            });
            await page.close();
        }
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
