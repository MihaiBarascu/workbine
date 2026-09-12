// Isolated browser + real Laravel form; Cloudflare is stubbed in the test router.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 900 },
    });
    const page = await context.newPage();
    const root = 'http://127.0.0.1:8001';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    let blockScript = true;
    let scriptLoads = 0;
    await page.route(
        'https://challenges.cloudflare.com/turnstile/v0/api.js*',
        async (route) => {
            scriptLoads++;
            if (blockScript) return route.abort();
            return route.fulfill({
                contentType: 'application/javascript',
                body: `
            window.testWidgets = new Map();
            window.testWidgetCount = 0;
            window.turnstile = {
                render(container, options) {
                    const id = String(++window.testWidgetCount);
                    window.testOptions = options;
                    container.textContent = 'Test verification';
                    window.testWidgets.set(id, container);
                    return id;
                },
                remove(id) {
                    window.testWidgets.get(id).replaceChildren();
                    window.testWidgets.delete(id);
                }
            };
        `,
            });
        },
    );
    const submit = page.getByRole('button', {
        name: 'Create account',
        exact: true,
    });
    const password = 'browser-test-password-2026!';
    async function verify(token = 'browser-test-token') {
        await page.evaluate(
            (value) => window.testOptions.callback(value),
            token,
        );
        await page.waitForFunction(
            () =>
                !document.querySelector('[data-test="register-user-button"]')
                    .disabled,
        );
    }
    try {
        await page.goto(`${root}/register`);
        await page.locator('[name="name"]').fill('Turnstile Test Member');
        await page
            .locator('[name="email"]')
            .fill('turnstile-browser@example.test');
        await page.locator('[name="password"]').fill(password);
        await page.locator('[name="password_confirmation"]').fill(password);
        await page
            .getByRole('button', { name: 'Retry verification' })
            .waitFor();
        assert.equal(await submit.isDisabled(), true);
        blockScript = false;
        await page.getByRole('button', { name: 'Retry verification' }).click();
        await page.waitForFunction(() => !!window.testOptions);
        await verify();

        await page.evaluate(() => window.testOptions['expired-callback']());
        await page
            .getByText('Verification expired. Please verify again.')
            .waitFor();
        assert.equal(await submit.isDisabled(), true);
        assert.equal(
            await page.locator('[name="cf-turnstile-response"]').inputValue(),
            '',
        );
        await page.getByRole('button', { name: 'Retry verification' }).click();
        await page.waitForFunction(() => window.testWidgetCount === 2);
        await verify('rejected-test-token');
        await submit.click();
        await page
            .getByText(
                'Please complete the verification again, then create your account.',
            )
            .waitFor();
        assert.equal(
            await page.locator('[name="name"]').inputValue(),
            'Turnstile Test Member',
        );
        assert.equal(
            await page.locator('[name="email"]').inputValue(),
            'turnstile-browser@example.test',
        );
        assert.equal(
            await page.locator('[name="password"]').inputValue(),
            password,
        );
        await page.waitForFunction(() => window.testWidgetCount === 3);
        assert.equal(await submit.isDisabled(), true);
        assert.equal(await page.evaluate(() => window.testWidgets.size), 1);

        await page.evaluate(() => window.testOptions['error-callback']());
        await page.getByRole('button', { name: 'Retry verification' }).click();
        await page.waitForFunction(() => window.testWidgetCount === 4);
        await verify();
        await submit.click();
        await page.waitForURL(/\/email\/verify$/);
        assert.equal(await page.evaluate(() => window.testWidgets.size), 0);
        assert.equal(
            scriptLoads,
            2,
            'Script reused after the failed load was retried',
        );

        const visitor = await browser.newContext();
        const visitorPage = await visitor.newPage();
        await visitorPage.goto(`${root}/forgot-password`);
        assert.equal(
            await visitorPage
                .locator('script[src*="challenges.cloudflare.com"]')
                .count(),
            0,
        );
        await visitor.close();
        assert.deepEqual(errors, []);
        console.log(
            'PASS: Turnstile load retry, expiry, rejected token, preserved fields, widget cleanup and successful registration.',
        );
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
