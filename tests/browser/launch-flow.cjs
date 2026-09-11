// Mutations run only against the disposable local preview application.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdir } = require('node:fs/promises');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        colorScheme: 'light',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    const email = 'launch-preview@example.test';
    const password = 'local-launch-test-password-2026!';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mkdir(output, { recursive: true });

    async function capture(
        name,
        width = 375,
        colorScheme = 'light',
        targetPage = page,
    ) {
        await targetPage.setViewportSize({
            width,
            height: width >= 1024 ? 1080 : 812,
        });
        await targetPage.emulateMedia({ colorScheme });
        await targetPage.evaluate(() => document.fonts.ready);
        assert.equal(
            await targetPage.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            true,
            `${name}: no horizontal overflow`,
        );
        assert.equal(await targetPage.locator('main h1').count(), 1);
        await targetPage.waitForFunction(
            () => document.querySelectorAll('[data-sonner-toast]').length === 0,
        );
        await targetPage.evaluate(() => window.scrollTo(0, 0));
        await targetPage.screenshot({
            path: `${output}/${name}.png`,
            fullPage: true,
            animations: 'disabled',
        });
    }

    async function openSaved() {
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page.getByRole('menuitem', { name: 'Saved topics' }).click();
        await page
            .getByRole('heading', { name: 'Saved topics', exact: true })
            .waitFor();
    }

    async function logout() {
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page.getByRole('menuitem', { name: 'Log out' }).click();
        await page.getByRole('link', { name: 'Log in', exact: true }).waitFor();
    }

    try {
        await page.goto(`${root}/register`);
        await page.locator('input[name="name"]').fill('Launch Preview Member');
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page
            .locator('input[name="password_confirmation"]')
            .fill(password);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/topics$/);

        await openSaved();
        await page
            .getByRole('heading', { name: 'Keep useful topics close' })
            .waitFor();
        await capture('saved-empty-mobile');

        await page.goto(`${root}/topics/create`);
        await page
            .locator('input[name="title"]')
            .fill('Keeping a useful launch checklist');
        await page
            .locator('textarea[name="description"]')
            .fill(
                'A small project needs a short checklist that can be repeated each week.',
            );
        await page.getByRole('checkbox', { name: 'Add my method too' }).check();
        await page
            .locator('input[name="method_title"]')
            .fill('Try one complete member journey');
        await page
            .locator('textarea[name="method_body"]')
            .fill(
                'I use a separate test account, complete one contribution and write down the result before checking the next journey.',
            );
        await page
            .getByRole('button', {
                name: 'Publish topic & method',
                exact: true,
            })
            .click();
        await page.waitForURL(/\/topics\/keeping-a-useful-launch-checklist$/);
        const topicPath = new URL(page.url()).pathname;
        const method = page.locator('main article').first();
        const methodId = await method.getAttribute('id');
        assert.match(methodId, /^method-\d+$/);

        await page
            .getByRole('button', { name: 'Save topic', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Remove saved topic' })
            .waitFor();
        await page
            .getByText('0 people saved this topic', { exact: false })
            .waitFor();
        await page
            .getByRole('link', { name: 'Report topic', exact: true })
            .click();
        await page
            .getByRole('heading', { name: 'Report content', exact: true })
            .waitFor();
        await page.locator('select[name="reason"]').selectOption('other');
        await page
            .getByRole('button', { name: 'Send report', exact: true })
            .click();
        await page.locator('#details-error').waitFor();
        await page
            .locator('textarea[name="details"]')
            .fill(
                'Synthetic preview report to verify the private review flow.',
            );
        await capture('report-form-small-dark', 320, 'dark');
        await page
            .getByRole('button', { name: 'Send report', exact: true })
            .click();
        await page
            .getByText('Report received. Thank you for flagging it.', {
                exact: true,
            })
            .waitFor();
        console.log(
            'PASS report submission, required context and contribution return',
        );
        await openSaved();
        assert.equal(await page.locator('main article').count(), 1);
        await capture('saved-topics-desktop', 1440);
        await capture('saved-topics-small-dark', 320, 'dark');
        await page.getByRole('button', { name: 'Remove saved topic' }).click();
        await page
            .getByRole('heading', { name: 'Keep useful topics close' })
            .waitFor();
        await page.goto(root + topicPath);
        await page
            .getByRole('button', { name: 'Save topic', exact: true })
            .waitFor();
        console.log(
            'PASS private saved list navigation, persistence, removal and empty state',
        );

        await page
            .getByRole('link', { name: 'Edit topic', exact: true })
            .click();
        await page.getByRole('heading', { name: 'Edit your topic' }).waitFor();
        assert.equal(
            await page.locator('input[name="title"]').inputValue(),
            'Keeping a useful launch checklist',
        );
        await page
            .locator('input[name="title"]')
            .fill('Keeping a practical weekly launch checklist');
        await page
            .locator('textarea[name="description"]')
            .fill(
                'Repeat the same member journeys each week and keep the original discussion attached.',
            );
        await capture('topic-edit-mobile');
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page
            .getByRole('heading', {
                name: 'Keeping a practical weekly launch checklist',
                exact: true,
            })
            .waitFor();
        assert.equal(
            new URL(page.url()).pathname,
            topicPath,
            'Editing keeps the topic link stable',
        );
        assert.equal(
            await page.locator(`#${methodId}`).count(),
            1,
            'Existing method remains attached',
        );

        await page
            .locator(`#${methodId}`)
            .getByRole('link', { name: 'Edit method', exact: true })
            .click();
        await page.getByRole('heading', { name: 'Edit your method' }).waitFor();
        const updatedBody =
            'I keep a separate test account and repeat the full contribution flow. I also check an empty list, a small phone screen and the saved result after reloading.';
        await page
            .locator('input[name="title"]')
            .fill('Repeat the complete member journey weekly');
        await page.locator('textarea[name="body"]').fill(updatedBody);
        await page
            .locator('input[name="source_url"]')
            .fill('ftp://example.com/checklist');
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page.locator('#source_url-error').waitFor();
        assert.equal(
            await page.locator('textarea[name="body"]').inputValue(),
            updatedBody,
            'Validation preserves the edited method',
        );
        await page
            .locator('input[name="source_url"]')
            .fill('https://example.com/checklist');
        await capture('method-edit-desktop', 1440);
        await capture('method-edit-small-dark', 320, 'dark');
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page
            .getByRole('heading', {
                name: 'Repeat the complete member journey weekly',
                exact: true,
            })
            .waitFor();
        assert.equal(new URL(page.url()).pathname, topicPath);
        assert.equal(new URL(page.url()).hash, `#${methodId}`);
        await page.reload();
        await page
            .locator(`#${methodId}`)
            .getByText(updatedBody, { exact: true })
            .waitFor();
        await capture('edited-topic-small-dark', 320, 'dark');
        console.log(
            'PASS topic and method editing, stable links, source validation and persistence',
        );

        const stalePage = await context.newPage();
        stalePage.setDefaultTimeout(15000);
        stalePage.on('pageerror', (error) => errors.push(error.message));
        await stalePage.goto(`${root}${topicPath}/edit`);
        await stalePage
            .locator('input[name="title"]')
            .fill('A stale browser tab must not replace newer changes');
        await page
            .getByRole('link', { name: 'Edit topic', exact: true })
            .click();
        await page
            .locator('textarea[name="description"]')
            .fill('The current version includes an extra accessibility check.');
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page
            .getByRole('heading', {
                name: 'Keeping a practical weekly launch checklist',
                exact: true,
            })
            .waitFor();
        await stalePage
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await stalePage
            .getByRole('alert')
            .filter({
                hasText: 'This topic changed after you opened the editor.',
            })
            .waitFor();
        assert.equal(
            await stalePage.locator('input[name="title"]').inputValue(),
            'A stale browser tab must not replace newer changes',
        );
        await stalePage
            .getByRole('link', { name: 'Reload the latest version' })
            .click();
        await stalePage.locator('input[name="title"]').waitFor();
        assert.equal(
            await stalePage.locator('input[name="title"]').inputValue(),
            'Keeping a practical weekly launch checklist',
        );
        await stalePage.close();
        console.log(
            'PASS stale editor recovery without overwriting newer contributions',
        );

        const authorProfilePath = await page
            .locator('.wb-topic-heading .wb-member-link')
            .getAttribute('href');
        assert.match(authorProfilePath, /^\/members\//);
        const supporterContext = await browser.newContext({
            viewport: { width: 1440, height: 1080 },
        });
        const supporterPage = await supporterContext.newPage();
        const publicProfile = await browser.newPage({
            viewport: { width: 1440, height: 1080 },
            colorScheme: 'light',
        });
        for (const extraPage of [supporterPage, publicProfile]) {
            extraPage.setDefaultTimeout(15000);
            extraPage.on('pageerror', (error) => errors.push(error.message));
        }

        async function checkImpact(saves, worked, partly) {
            await publicProfile.goto(root + authorProfilePath);
            await publicProfile
                .getByRole('link', {
                    name: `Worked for others: ${worked}`,
                    exact: true,
                })
                .waitFor();
            const props = await publicProfile.evaluate(() => {
                const script = document.querySelector(
                    'script[type="application/json"][data-page]',
                );
                const payload =
                    script?.textContent ??
                    document
                        .querySelector('[data-page]')
                        ?.getAttribute('data-page');
                return JSON.parse(payload).props;
            });
            assert.equal(
                props.auth.user,
                null,
                'Impact is visible on the public profile',
            );
            assert.deepEqual(props.member.impact, {
                methods_tried: worked + partly > 0 ? 1 : 0,
                topic_saves: saves,
                worked,
                partly,
            });
            assert.equal(props.member.counts.topic_saves, saves);
            assert.equal('saved_by' in props.member, false);
            assert.equal('saved_topics' in props.member, false);
            assert.equal(
                JSON.stringify(props.member).includes(
                    'preview-reputation-supporter',
                ),
                false,
                'The profile never identifies a private saver',
            );
        }

        await supporterPage.goto(`${root}/login`);
        await supporterPage
            .locator('input[name="email"]')
            .fill('preview-reputation-supporter@example.test');
        await supporterPage
            .locator('input[name="password"]')
            .fill('preview-only-password');
        await supporterPage
            .getByRole('button', { name: 'Log in', exact: true })
            .click();
        await supporterPage.waitForURL(/\/topics$/);
        await supporterPage.goto(root + topicPath);
        await supporterPage
            .getByRole('button', { name: 'Save topic', exact: true })
            .click();
        await supporterPage
            .getByRole('button', { name: 'Remove saved topic' })
            .waitFor();
        await supporterPage
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await supporterPage
            .locator('select[name="outcome"]')
            .selectOption('worked');
        await supporterPage
            .locator('textarea[name="body"]')
            .fill(
                'I repeated the complete checklist in a separate preview account and the weekly review worked for this small project.',
            );
        await supporterPage
            .getByRole('button', { name: 'Publish my experience', exact: true })
            .click();
        await supporterPage
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();
        const impactExperienceUrl = supporterPage.url().split('#')[0];
        await checkImpact(1, 1, 0);
        await capture('impact-profile-desktop', 1440, 'light', publicProfile);
        await capture('impact-profile-small-dark', 320, 'dark', publicProfile);
        await publicProfile
            .getByRole('link', { name: 'Topic saves: 1', exact: true })
            .click();
        await publicProfile.waitForURL(/view=topics&impact=saved/);
        await publicProfile
            .getByRole('heading', {
                name: 'Keeping a practical weekly launch checklist',
                exact: true,
            })
            .waitFor();
        await publicProfile
            .getByRole('link', { name: 'Worked for others: 1', exact: true })
            .click();
        await publicProfile.waitForURL(/view=methods&impact=worked/);
        assert.equal(
            await publicProfile.locator('#contributions article').count(),
            1,
        );
        await capture(
            'impact-filtered-profile-small-dark',
            320,
            'dark',
            publicProfile,
        );
        await publicProfile
            .locator('#contributions article')
            .getByRole('link', { name: '1 worked', exact: true })
            .click();
        await publicProfile.waitForURL(/outcome=worked/);
        await publicProfile
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();
        const outcomeFilters = publicProfile.getByRole('navigation', {
            name: 'Filter experiences by outcome',
        });
        assert.equal(
            await outcomeFilters
                .getByRole('link', {
                    name: 'Worked for me: 1 experience',
                    exact: true,
                })
                .getAttribute('aria-current'),
            'page',
        );
        await capture(
            'experience-filter-small-dark',
            320,
            'dark',
            publicProfile,
        );
        await outcomeFilters
            .getByRole('link', {
                name: 'Partly worked: 0 experiences',
                exact: true,
            })
            .click();
        await publicProfile
            .getByRole('heading', {
                name: 'No experiences with this outcome yet.',
                exact: true,
            })
            .waitFor();
        await outcomeFilters
            .getByRole('link', {
                name: 'Worked for me: 1 experience',
                exact: true,
            })
            .waitFor();
        await publicProfile
            .getByRole('link', { name: 'All experiences', exact: true })
            .click();
        await publicProfile
            .getByRole('heading', { name: '1 experience', exact: true })
            .waitFor();

        await supporterPage
            .locator('select[name="outcome"]')
            .selectOption('partly');
        await supporterPage
            .locator('textarea[name="body"]')
            .fill(
                'After a second trial it only partly worked: the weekly review needed more time when several tasks changed together.',
            );
        await supporterPage
            .getByRole('button', { name: 'Update my experience', exact: true })
            .click();
        await supporterPage
            .locator('main article')
            .getByText('After a second trial it only partly worked:', {
                exact: false,
            })
            .waitFor();
        await checkImpact(1, 0, 1);
        await supporterPage.goto(`${root}/saved`);
        await supporterPage
            .getByRole('button', { name: 'Remove saved topic' })
            .click();
        await supporterPage
            .getByRole('heading', { name: 'Keep useful topics close' })
            .waitFor();
        await checkImpact(0, 0, 1);
        await supporterPage.goto(impactExperienceUrl);
        supporterPage.once('dialog', (dialog) => dialog.accept());
        await supporterPage
            .getByRole('button', { name: 'Remove my experience', exact: true })
            .click();
        await supporterPage
            .getByRole('heading', { name: '0 experiences', exact: true })
            .waitFor();
        await checkImpact(0, 0, 0);
        await publicProfile.close();
        await supporterContext.close();
        console.log(
            'PASS clickable impact cards, filtered contributions and outcomes, persisted updates and private saved lists',
        );

        await page.goto(`${root}/topics/preview-first-customer`);
        assert.equal(
            await page
                .getByRole('link', { name: 'Edit topic', exact: true })
                .count(),
            0,
        );
        assert.equal(
            await page
                .getByRole('link', { name: 'Edit method', exact: true })
                .count(),
            0,
        );
        await logout();
        await page.goto(`${root}/topics/preview-first-customer`);
        await page
            .getByRole('link', { name: 'Log in to save', exact: true })
            .click();
        await page.waitForURL(/\/login$/);
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page.waitForURL(/\/topics\/preview-first-customer$/);
        await page
            .getByRole('button', { name: 'Save topic', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Remove saved topic' })
            .waitFor();
        await page
            .getByText('1 person saved this topic', { exact: false })
            .waitFor();
        await openSaved();
        await page
            .getByRole('heading', {
                name: 'How do you find the first customer for a small SaaS?',
                exact: true,
            })
            .waitFor();
        await logout();
        await page.goBack();
        await page.waitForURL(/\/login$/);
        assert.equal(
            await page
                .getByRole('heading', { name: 'Saved topics', exact: true })
                .count(),
            0,
            'Back after logout cannot restore a private saved list',
        );
        console.log(
            'PASS intended-login save and encrypted saved history cleared at logout',
        );

        const missingResponse = await page.goto(
            `${root}/launch-preview-missing-page`,
        );
        assert.equal(missingResponse.status(), 404);
        await page
            .getByRole('heading', {
                name: 'This page could not be found',
                exact: true,
            })
            .waitFor();
        await capture('error-404-desktop', 1440);
        await capture('error-404-small-dark', 320, 'dark');
        await page
            .getByRole('link', { name: 'Browse topics', exact: true })
            .click();
        await page.waitForURL(/\/topics$/);
        // Simulate a topic disappearing after the feed loaded; Laravel still
        // handles the real missing URL and returns its normal Inertia 404.
        await page.route('**/topics/preview-unanswered', (route) =>
            route.continue({
                url: `${root}/topics/launch-preview-missing-topic`,
            }),
        );
        const inertiaError = page.waitForResponse(
            (response) =>
                response.status() === 404 &&
                response.request().headers()['x-inertia'] === 'true',
        );
        await page
            .getByRole('heading', {
                name: 'How do you keep a side project moving with only a few hours a week?',
                exact: true,
            })
            .getByRole('link')
            .click();
        const response = await inertiaError;
        assert.equal(response.headers()['x-inertia'], 'true');
        await page
            .getByRole('heading', {
                name: 'This page could not be found',
                exact: true,
            })
            .waitFor();
        assert.equal(
            await page.locator('iframe').count(),
            0,
            'Inertia errors render in the application without the invalid-response modal',
        );
        await capture('error-404-inertia-small-dark', 320, 'dark');
        await page
            .getByRole('link', { name: 'Browse topics', exact: true })
            .click();
        await page.waitForURL(/\/topics$/);
        assert.deepEqual(
            errors,
            [],
            'No client runtime errors in launch flows',
        );
        console.log(
            'PASS branded direct and Inertia 404 navigation and recovery',
        );
    } catch (error) {
        await page
            .screenshot({
                path: `${output}/launch-flow-failure.png`,
                fullPage: true,
            })
            .catch(() => {});
        throw error;
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
