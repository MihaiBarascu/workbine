// Public Cloudflare test widget; Siteverify is stubbed by turnstile-router.php.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    const browser = await chromium.launch();
    try {
        for (const [width, colorScheme] of [
            [320, 'light'],
            [375, 'dark'],
            [1440, 'light'],
        ]) {
            const context = await browser.newContext({
                viewport: { width, height: 1000 },
                colorScheme,
            });
            const page = await context.newPage();
            await page.goto('http://127.0.0.1:8001/register');
            await page.waitForFunction(
                () =>
                    document.querySelector('[name="cf-turnstile-response"]')
                        ?.value === 'XXXX.DUMMY.TOKEN.XXXX',
                { timeout: 30000 },
            );
            assert.equal(
                await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <= innerWidth + 1,
                ),
                true,
            );
            await page.screenshot({
                path: `/tmp/workbine-ui-preview/turnstile-${width}-${colorScheme}.png`,
                fullPage: true,
            });
            if (width === 1440) {
                await page.setViewportSize({ width: 320, height: 1000 });
                await page
                    .getByText('Verification complete.', { exact: true })
                    .waitFor();
                await page.waitForFunction(
                    () =>
                        document.documentElement.scrollWidth <= innerWidth + 1,
                );
            }
            await context.close();
        }
        console.log(
            'PASS: real Cloudflare test widget loads and verifies at 320px, 375px dark and 1440px; resize has no overflow.',
        );
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
