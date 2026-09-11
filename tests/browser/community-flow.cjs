// Runs only against the disposable local CI application; never writes production data.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdir } = require('node:fs/promises');
const browserRequire = createRequire('/tmp/workbine-browser/package.json');
const { chromium } = browserRequire('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    await mkdir(output, { recursive: true });

    async function checkLayout() {
        assert.equal(
            await page.evaluate(
                () =>
                    document.documentElement.scrollWidth <=
                    window.innerWidth + 1,
            ),
            true,
            'Page must not overflow horizontally',
        );
    }

    try {
        await page.goto(`${root}/topics`);
        await page
            .getByRole('searchbox', { name: 'Search topics' })
            .fill('customer');
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await page.waitForURL(/q=customer/);
        await page
            .getByRole('link', { name: 'Needs a method', exact: true })
            .click();
        await page
            .getByRole('heading', { name: 'No matching topics yet' })
            .waitFor();
        assert.equal(new URL(page.url()).searchParams.get('q'), 'customer');
        await page.getByRole('link', { name: 'Clear search' }).click();
        await page
            .getByRole('heading', {
                name: 'How do you keep a side project moving with only a few hours a week?',
            })
            .waitFor();
        await checkLayout();
        console.log('PASS search, filter composition and empty-state recovery');

        await page.goto(`${root}/topics/preview-first-customer`);
        await page
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await page.waitForURL(/\/login$/);
        await page
            .locator('input[name="email"]')
            .fill('preview-contributor@example.test');
        await page
            .locator('input[name="password"]')
            .fill('preview-only-password');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page.waitForURL(/\/experiences#share$/);
        assert.equal(
            await page.locator('[data-slot="sidebar-trigger"]').count(),
            0,
            'Community pages must not use the starter layout',
        );
        await page.locator('select[name="outcome"]').selectOption('partly');
        await page
            .locator('textarea[name="body"]')
            .fill(
                'I tested this with three product imports. It saved time, but inconsistent supplier files still needed manual corrections.',
            );
        await page.locator('input[name="tried_on"]').fill('2025-01-15');
        await page
            .locator('input[name="evidence_url"]')
            .fill('https://example.com/public-evidence');
        await page
            .getByRole('button', { name: 'Publish my experience', exact: true })
            .click();
        await page
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();
        await page
            .locator('main article')
            .getByText('I tested this', { exact: false })
            .waitFor();
        const experienceUrl = page.url().split('#')[0];
        await checkLayout();
        console.log(
            'PASS intended login and real browser experience submission',
        );

        await page.locator('select[name="outcome"]').selectOption('worked');
        await page
            .locator('textarea[name="body"]')
            .fill(
                'After adding one validation step, the repeated imports worked reliably. This is an update, not a second vote.',
            );
        await page
            .getByRole('button', { name: 'Update my experience', exact: true })
            .click();
        await page
            .locator('main article')
            .getByText('After adding one validation step', { exact: false })
            .waitFor();
        assert.equal(await page.locator('main article').count(), 1);
        page.once('dialog', (dialog) => dialog.accept());
        await page
            .getByRole('button', { name: 'Remove my experience', exact: true })
            .click();
        await page
            .getByRole('heading', { name: '0 experiences', exact: true })
            .waitFor();
        console.log('PASS experience update and removal without duplicates');

        await page
            .locator('select[name="outcome"]')
            .selectOption('did_not_work');
        await page
            .locator('textarea[name="body"]')
            .fill(
                'This did not fit our workflow because every supplier used a different format. I would standardize the inputs before trying again.',
            );
        await page
            .getByRole('button', { name: 'Publish my experience', exact: true })
            .click();
        await page
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();
        await page.waitForFunction(
            () => document.querySelectorAll('[data-sonner-toast]').length === 0,
        );
        await page.screenshot({
            path: `${output}/experience-mobile.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page.setViewportSize({ width: 320, height: 812 });
        await checkLayout();
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() =>
            document.documentElement.classList.contains('dark'),
        );
        await page.screenshot({
            path: `${output}/experience-small-dark.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(
            () => !document.documentElement.classList.contains('dark'),
        );
        await page.setViewportSize({ width: 1440, height: 1080 });
        await checkLayout();
        await page.screenshot({
            path: `${output}/experience-desktop.png`,
            fullPage: true,
            animations: 'disabled',
        });

        await page.goto(`${root}/topics/create`);
        await page
            .locator('input[name="title"]')
            .fill('How do you keep one useful weekly habit?');
        await page
            .locator('textarea[name="description"]')
            .fill(
                'I only have a few hours after work and want a routine that is realistic.',
            );
        await page
            .getByRole('button', { name: 'Publish topic', exact: true })
            .click();
        await page.waitForURL(
            /\/topics\/how-do-you-keep-one-useful-weekly-habit$/,
        );
        await page
            .getByRole('link', { name: 'Share a method', exact: true })
            .click();
        await page
            .locator('input[name="title"]')
            .fill('Reserve one small repeatable task');
        await page
            .locator('textarea[name="body"]')
            .fill(
                'I reserve twenty minutes for one repeatable task, write down the result, and stop before adding another task.',
            );
        await page
            .getByRole('button', { name: 'Share method', exact: true })
            .click();
        await page
            .getByRole('heading', {
                name: 'Reserve one small repeatable task',
                exact: true,
            })
            .waitFor();
        assert.equal(
            await page
                .getByRole('link', { name: 'I tried this', exact: true })
                .count(),
            0,
        );
        await page
            .getByRole('button', { name: 'Copy link', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: 'Link copied' })
            .waitFor();
        await checkLayout();
        await page
            .getByRole('link', { name: '0 experiences', exact: true })
            .click();
        await page
            .getByText('You shared this method.', { exact: false })
            .waitFor();
        assert.equal(await page.locator('select[name="outcome"]').count(), 0);
        console.log(
            'PASS authenticated Topic -> Method creation, copy link and no self-validation form',
        );

        await page.goto(`${root}/topics`);
        await page
            .locator('#new-topic')
            .fill('Automating product imports for an online store');
        await page
            .getByRole('button', { name: 'Start a topic', exact: true })
            .click();
        await page.waitForURL(/\/topics\/create\?/);
        assert.equal(
            await page.locator('input[name="title"]').inputValue(),
            'Automating product imports for an online store',
        );
        const includeMethod = page.getByRole('checkbox', {
            name: 'Add my method too',
        });
        assert.equal(await includeMethod.isChecked(), false);
        assert.equal(
            await page.locator('input[name="method_title"]').isVisible(),
            false,
        );
        await includeMethod.check();
        await page
            .locator('input[name="method_title"]')
            .fill('Check a small batch before importing everything');
        const methodBody =
            'I mapped supplier columns, tested ten products, then imported the remaining files. The weekly import was quicker, but new supplier formats still needed review.';
        await page.locator('textarea[name="method_body"]').fill(methodBody);
        await includeMethod.uncheck();
        await includeMethod.check();
        assert.equal(
            await page.locator('textarea[name="method_body"]').inputValue(),
            methodBody,
            'Toggling the optional method preserves the draft',
        );
        await page
            .locator('input[name="method_source_url"]')
            .fill('ftp://example.com/import');
        await page
            .getByRole('button', {
                name: 'Publish topic & method',
                exact: true,
            })
            .click();
        await page
            .getByText('The method source url field must be a valid URL.', {
                exact: true,
            })
            .waitFor();
        assert.equal(await includeMethod.isChecked(), true);
        assert.equal(
            await page.locator('textarea[name="method_body"]').inputValue(),
            methodBody,
            'Validation errors preserve the method draft',
        );
        assert.equal(
            await page.locator('input[name="title"]').inputValue(),
            'Automating product imports for an online store',
        );
        await page
            .locator('input[name="method_source_url"]')
            .fill('https://example.com/import');
        await page.setViewportSize({ width: 375, height: 812 });
        await checkLayout();
        await page.screenshot({
            path: `${output}/topic-with-method-form-mobile.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page.setViewportSize({ width: 1440, height: 1080 });
        await checkLayout();
        await page.screenshot({
            path: `${output}/topic-with-method-form-desktop.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page
            .getByRole('button', {
                name: 'Publish topic & method',
                exact: true,
            })
            .click();
        await page.waitForURL(
            /\/topics\/automating-product-imports-for-an-online-store$/,
        );
        await page
            .getByRole('heading', {
                name: 'Check a small batch before importing everything',
                exact: true,
            })
            .waitFor();
        assert.equal(await page.locator('main article').count(), 1);
        await page.setViewportSize({ width: 320, height: 812 });
        await checkLayout();
        await page.screenshot({
            path: `${output}/topic-with-first-method-mobile.png`,
            fullPage: true,
            animations: 'disabled',
        });
        console.log(
            'PASS topic with first method, subject title, draft toggle, validation recovery and mobile layout',
        );

        await context.clearCookies();
        await page.goto(experienceUrl);
        await page
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();
        await page
            .getByRole('link', {
                name: 'Log in to share an experience',
                exact: true,
            })
            .waitFor();
        assert.equal(await page.locator('select[name="outcome"]').count(), 0);
        assert.deepEqual(errors, [], 'No browser runtime errors');
        console.log(
            'PASS public persisted experience and zero browser runtime errors',
        );
    } catch (error) {
        await page
            .screenshot({ path: `${output}/failure.png`, fullPage: true })
            .catch(() => {});
        throw error;
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
