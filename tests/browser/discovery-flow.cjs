// All contributions below belong to the disposable preview database.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);
const verifyAccount = require('./verify-account.cjs');

(async () => {
    const browser = await chromium.launch();
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    const owner = await (await browser.newContext()).newPage();
    const contributor = await (await browser.newContext()).newPage();
    const errors = [];
    for (const page of [owner, contributor]) {
        page.setDefaultTimeout(15000);
        page.on('pageerror', (error) => errors.push(error.message));
    }
    async function register(page, name, email) {
        await page.goto(`${root}/register`);
        await page.locator('input[name="name"]').fill(name);
        await page.locator('input[name="email"]').fill(email);
        await page
            .locator('input[name="password"]')
            .fill('local-discovery-test-password!');
        await page
            .locator('input[name="password_confirmation"]')
            .fill('local-discovery-test-password!');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/email\/verify$/);
        await verifyAccount(page, email);
    }
    async function capture(page, name, width, colorScheme = 'light') {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(
            () => document.querySelectorAll('[data-sonner-toast]').length === 0,
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.equal(
            await page.locator('.wb-topbar').count(),
            1,
            'One community header',
        );
        assert.equal(
            await page.locator('main h1').count(),
            1,
            'One page heading',
        );
        assert.ok(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name}: no overflow`,
        );
        await page.screenshot({
            path: `${output}/${name}.png`,
            fullPage: true,
            animations: 'disabled',
        });
    }
    try {
        await register(
            owner,
            'Discovery Topic Author',
            'discovery-owner@example.test',
        );
        await owner.goto(`${root}/notifications`);
        await owner
            .getByRole('heading', { name: 'You’re all caught up', exact: true })
            .waitFor();
        await capture(owner, 'notifications-empty-mobile', 375);
        await owner.goto(`${root}/topics/create`);
        await owner.locator('#title').fill('Making a little room for learning');
        await owner.locator('#category').selectOption('ai');
        await owner.locator('#tags').fill('practice, habits');
        await owner
            .getByRole('button', { name: 'Publish topic', exact: true })
            .click();
        await owner.waitForURL(/making-a-little-room-for-learning$/);
        const topicUrl = owner.url();
        await register(
            contributor,
            'Discovery Method Author',
            'discovery-contributor@example.test',
        );
        await contributor.goto(topicUrl);
        await contributor
            .getByRole('link', { name: 'Create a method', exact: true })
            .click();
        await contributor
            .locator('input[name="title"]')
            .fill('Keep one small practice notebook');
        await contributor
            .locator('[contenteditable="true"]')
            .fill(
                'I keep a notebook open with one small exercise ready for the next day.',
            );
        const photo = await contributor.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#dce8ee';
            ctx.fillRect(0, 0, 640, 400);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(160, 70, 320, 260);
            ctx.fillStyle = '#315ade';
            ctx.font = '24px sans-serif';
            ctx.fillText('One small step', 220, 160);
            ctx.fillText('Preview example', 205, 225);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        await contributor
            .getByLabel('Upload photo', { exact: true })
            .setInputFiles({
                name: 'practice-notebook.png',
                mimeType: 'image/png',
                buffer: Buffer.from(photo, 'base64'),
            });
        await contributor.locator('.wb-editor img').waitFor();
        await contributor
            .getByRole('button', { name: 'Create method', exact: true })
            .click();
        await contributor
            .getByRole('heading', {
                name: 'Keep one small practice notebook',
                exact: true,
            })
            .waitFor();
        await owner.goto(`${root}/topics`);
        const card = owner
            .locator('main article')
            .filter({ hasText: 'Making a little room for learning' });
        await card
            .locator('.wb-entry-photo img')
            .evaluate((img) => img.decode());
        await card
            .getByRole('button', { name: 'Save topic', exact: true })
            .click();
        await card
            .getByRole('button', { name: 'Remove saved topic', exact: true })
            .waitFor();
        await capture(owner, 'discovery-desktop', 1440);
        await capture(owner, 'discovery-tablet', 900);
        assert.ok(
            await owner
                .locator('.wb-search')
                .evaluate((node) => node.getBoundingClientRect().height < 80),
            'Tablet search retains a compact input height',
        );
        await capture(owner, 'discovery-mobile', 375);
        await capture(owner, 'discovery-small-dark', 320, 'dark');
        await owner
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Notifications, 1 unread', exact: true })
            .click();
        await owner
            .getByRole('heading', { name: 'Notifications', exact: true })
            .waitFor();
        await owner.getByText('Unread', { exact: true }).waitFor();
        await capture(owner, 'notifications-unread-mobile', 375);
        await capture(owner, 'notifications-unread-desktop', 1440);
        await owner.locator('.wb-notification-item').click();
        await owner.waitForURL(/#method-\d+$/);
        await owner
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Notifications', exact: true })
            .waitFor();
        await owner
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await owner.locator('select[name="outcome"]').selectOption('partly');
        await owner
            .locator('[contenteditable="true"]')
            .fill(
                'It helped to prepare the exercise, but mornings fit my week better.',
            );
        await owner
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await owner
            .locator('main article')
            .filter({ hasText: 'mornings fit my week better' })
            .waitFor();
        await contributor.goto(`${root}/notifications`);
        await contributor
            .locator('.wb-notification-item')
            .filter({ hasText: 'shared what happened' })
            .waitFor();
        await contributor
            .getByRole('button', { name: 'Mark all as read', exact: true })
            .click();
        await contributor
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Notifications', exact: true })
            .waitFor();
        assert.equal(
            await contributor.getByText('Unread', { exact: true }).count(),
            0,
        );
        await contributor.locator('.wb-notification-item').click();
        await contributor.waitForURL(/#experience-\d+$/);
        assert.ok(
            await contributor
                .locator(new URL(contributor.url()).hash)
                .isVisible(),
        );
        await owner.goto(`${root}/community/guide`);
        await capture(owner, 'community-guide-mobile', 375);
        await capture(owner, 'community-guide-dark', 1440, 'dark');
        await owner
            .getByRole('button', { name: 'Account menu', exact: true })
            .click();
        await owner
            .getByRole('menuitem', { name: 'My topics', exact: true })
            .click();
        await owner.waitForURL(/\/members\/.+\?view=topics$/);
        await owner
            .getByRole('heading', {
                name: 'Making a little room for learning',
                exact: true,
            })
            .waitFor();
        await contributor.goto(`${root}/topics?category=ai`);
        const learningCard = contributor
            .locator('main article')
            .filter({ hasText: 'Making a little room for learning' });
        await learningCard
            .getByRole('link', { name: 'AI in Practice', exact: true })
            .waitFor();
        assert.equal(
            await learningCard
                .locator('.wb-entry-photo')
                .getByText('AI in Practice', { exact: true })
                .count(),
            0,
            'No labels over photos',
        );
        await learningCard
            .getByRole('button', { name: 'Appreciate topic', exact: true })
            .click();
        await learningCard
            .getByRole('button', { name: 'Remove appreciation', exact: true })
            .waitFor();
        await contributor.reload();
        await learningCard
            .getByRole('button', { name: 'Remove appreciation', exact: true })
            .click();
        await learningCard
            .getByRole('button', { name: 'Appreciate topic', exact: true })
            .waitFor();
        await contributor
            .getByLabel('Filter by tag', { exact: true })
            .selectOption('practice');
        await contributor.waitForURL(/tag=practice/);
        await learningCard.waitFor();
        await contributor
            .getByLabel('Sort topics', { exact: true })
            .selectOption('oldest');
        await contributor.waitForURL(/sort=oldest/);
        await contributor
            .getByRole('link', { name: 'Trending', exact: true })
            .click();
        await contributor
            .getByText(
                'Based on methods shared and topics saved in the last 14 days.',
                { exact: true },
            )
            .waitFor();
        await contributor
            .getByRole('link', { name: 'Most saved', exact: true })
            .click();
        await contributor
            .getByRole('button', { name: 'Hide community guide', exact: true })
            .click();
        await contributor
            .getByRole('button', { name: 'Show guide', exact: true })
            .waitFor();
        await contributor.reload();
        await contributor
            .getByRole('button', { name: 'Show guide', exact: true })
            .click();
        await contributor
            .getByRole('button', { name: 'Hide community guide', exact: true })
            .waitFor();
        await contributor.keyboard.press('ControlOrMeta+k');
        assert.equal(
            await contributor
                .locator('#topic-search')
                .evaluate((input) => document.activeElement === input),
            true,
        );
        await contributor
            .getByLabel('Search in', { exact: true })
            .selectOption('people');
        await contributor
            .locator('#topic-search')
            .fill('Discovery Topic Author');
        await contributor
            .getByRole('button', { name: 'Search', exact: true })
            .click();
        await contributor
            .locator('.wb-person-card')
            .filter({ hasText: 'Discovery Topic Author' })
            .waitFor();
        await capture(contributor, 'people-search-desktop', 1440);
        await contributor.goto(`${root}/topics`);
        await contributor.setViewportSize({ width: 375, height: 900 });
        await contributor
            .getByRole('button', { name: 'Open navigation', exact: true })
            .click();
        await contributor
            .getByRole('navigation', { name: 'Categories', exact: true })
            .getByRole('link', { name: 'AI in Practice', exact: true })
            .click();
        await contributor.waitForURL(/category=ai/);
        assert.equal(
            await contributor
                .getByRole('navigation', { name: 'Categories', exact: true })
                .isVisible(),
            false,
        );
        await contributor.emulateMedia({ reducedMotion: 'reduce' });
        await capture(contributor, 'connected-reduced-motion-mobile', 375);
        assert.equal(
            await contributor.locator('.wb-universe canvas').isVisible(),
            false,
        );
        await contributor.emulateMedia({ reducedMotion: 'no-preference' });
        await contributor.setViewportSize({ width: 1440, height: 900 });
        await contributor.mouse.move(1100, 160);
        await contributor.waitForFunction(
            () =>
                Math.abs(
                    parseFloat(
                        document
                            .querySelector('.wb-universe')
                            .style.getPropertyValue('--universe-x'),
                    ),
                ) > 0.1,
        );
        await capture(contributor, 'connected-pointer-desktop', 1440);
        assert.deepEqual(errors, []);
        console.log(
            'PASS real feed photo and save, method/response notifications, read/open actions, My topics and responsive community guide',
        );
    } catch (error) {
        await owner
            .screenshot({
                path: `${output}/discovery-owner-failure.png`,
                fullPage: true,
            })
            .catch(() => {});
        await contributor
            .screenshot({
                path: `${output}/discovery-contributor-failure.png`,
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
