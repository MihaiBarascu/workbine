const verifyAccount = require('./verify-account.cjs');
// Mutation checks are intentionally limited to the disposable local application.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdir } = require('node:fs/promises');
const requireBrowser = createRequire('/tmp/workbine-browser/package.json');
const { chromium } = requireBrowser('playwright');

(async () => {
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    await mkdir(output, { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1080 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    async function initialProps() {
        return page.evaluate(() => {
            const script = document.querySelector(
                'script[type="application/json"][data-page]',
            );
            const data =
                script?.textContent ??
                document
                    .querySelector('[data-page]')
                    ?.getAttribute('data-page');
            return JSON.parse(data).props;
        });
    }

    // Exercise the UI's disabled-upload state without changing server configuration.
    async function hideUploadControlsOnVisits(url) {
        await page.route(url, async (route) => {
            if (
                route.request().method() === 'GET' &&
                route.request().headers()['x-inertia']
            ) {
                const response = await route.fetch();
                const data = await response.json();
                data.props.media.enabled = false;
                await route.fulfill({ response, json: data });
            } else {
                await route.continue();
            }
        });
    }

    async function fixture(color) {
        const data = await page.evaluate((color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 768;
            const drawing = canvas.getContext('2d');
            drawing.fillStyle = color;
            drawing.fillRect(0, 0, 1024, 768);
            drawing.fillStyle = '#ffffff';
            drawing.fillRect(96, 96, 832, 576);
            drawing.fillStyle = '#242730';
            drawing.font = '48px sans-serif';
            drawing.fillText('Local image upload check', 140, 260);
            drawing.font = '28px sans-serif';
            drawing.fillText(
                'Synthetic evidence for the browser test',
                140,
                320,
            );
            return canvas.toDataURL('image/png').split(',')[1];
        }, color);
        return {
            name: 'my-practical-experience-photo-with-a-long-filename.png',
            mimeType: 'image/png',
            buffer: Buffer.from(data, 'base64'),
        };
    }

    async function loaded(image) {
        await image.waitFor();
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(async (node) => node.decode());
        assert.ok(
            await image.evaluate((node) => node.naturalWidth > 0),
            'Image decodes successfully',
        );
    }

    async function capture(name) {
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            true,
            `${name} has no horizontal overflow`,
        );
        await page.waitForFunction(
            () => document.querySelectorAll('[data-sonner-toast]').length === 0,
        );
        await page.screenshot({
            path: `${output}/${name}.png`,
            fullPage: true,
            animations: 'disabled',
        });
    }

    async function responsiveCaptures(name) {
        await page.setViewportSize({ width: 1440, height: 1080 });
        await capture(`${name}-desktop`);
        await page.setViewportSize({ width: 320, height: 812 });
        await capture(`${name}-small`);
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() =>
            document.documentElement.classList.contains('dark'),
        );
        await capture(`${name}-small-dark`);
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(
            () => !document.documentElement.classList.contains('dark'),
        );
        await page.setViewportSize({ width: 1440, height: 1080 });
    }

    async function saveAvatar() {
        const request = page.waitForRequest(
            (request) =>
                request.url() === `${root}/settings/profile/avatar` &&
                request.method() === 'POST',
        );
        await page
            .getByRole('button', { name: 'Save photo', exact: true })
            .click();
        assert.match(
            (await request).headers()['content-type'],
            /^multipart\/form-data;/,
        );
        await page
            .getByRole('status')
            .filter({ hasText: 'Your profile photo has been saved.' })
            .waitFor();
        await page.reload();
        const props = await initialProps();
        assert.ok(
            props.auth.user.avatar_url,
            'Saved avatar is returned after reload',
        );
        const photo = page
            .locator('#avatar')
            .locator('..')
            .getByAltText('Current photo');
        await loaded(photo);
        const dimensions = await photo.evaluate((image) => ({
            width: image.naturalWidth,
            height: image.naturalHeight,
        }));
        assert.equal(
            dimensions.width,
            dimensions.height,
            'Avatar is cropped to a square',
        );
        assert.ok(dimensions.width <= 512, 'Avatar dimensions are reduced');
        const response = await context.request.get(props.auth.user.avatar_url);
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-type'], /^image\/webp/);
        return props.auth.user.avatar_url;
    }

    try {
        await page.goto(`${root}/register`);
        await page.locator('input[name="name"]').fill('Media test contributor');
        await page
            .locator('input[name="email"]')
            .fill('media-browser@example.test');
        await page
            .locator('input[name="password"]')
            .fill('local-media-test-password-2026!');
        await page
            .locator('input[name="password_confirmation"]')
            .fill('local-media-test-password-2026!');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/email\/verify$/);
        await verifyAccount(page, 'media-browser@example.test');
        await page.goto(`${root}/settings/profile`);
        const props = await initialProps();
        assert.equal(
            props.media.enabled,
            true,
            'Isolated browser environment enables uploads',
        );
        const memberUrl = `${root}/members/${props.auth.user.username}`;
        const blue = await fixture('#315ed7');
        const grey = await fixture('#626b7c');

        await page.locator('#avatar').setInputFiles({
            name: 'not-a-photo.svg',
            mimeType: 'image/svg+xml',
            buffer: Buffer.from('<svg/>'),
        });
        await page
            .getByText('Choose a JPEG, PNG or WebP image.', { exact: true })
            .waitFor();
        assert.equal(
            await page
                .getByRole('button', { name: 'Save photo', exact: true })
                .isDisabled(),
            true,
        );
        await page.locator('#avatar').setInputFiles(blue);
        await loaded(page.getByAltText('Selected photo preview'));
        const firstAvatar = await saveAvatar();
        await responsiveCaptures('media-profile-settings');
        await page.goto(memberUrl);
        await loaded(page.locator('.wb-profile-intro > .wb-avatar img'));
        assert.equal(
            await page
                .locator('.wb-profile-intro > .wb-avatar img')
                .getAttribute('src'),
            firstAvatar,
        );
        await responsiveCaptures('media-member');
        await page.goto(`${root}/settings/profile`);
        await page.locator('#avatar').setInputFiles(grey);
        const secondAvatar = await saveAvatar();
        assert.notEqual(
            secondAvatar,
            firstAvatar,
            'Replacement uses a fresh image URL',
        );
        await page.goto(memberUrl);
        await hideUploadControlsOnVisits(`${root}/settings/profile`);
        await page
            .getByRole('link', { name: 'Edit profile', exact: true })
            .click();
        await page
            .getByRole('heading', { name: 'Profile photo', exact: true })
            .waitFor();
        assert.equal(
            await page.locator('#avatar').count(),
            0,
            'Paused uploads hide the file input',
        );
        await loaded(page.getByAltText('Current photo'));
        await page
            .getByRole('button', { name: 'Remove profile photo', exact: true })
            .click();
        // Redirects after mutation use the real enabled server configuration.
        // The removable photo must disappear regardless of the upload switch.
        await page
            .getByRole('button', { name: 'Remove profile photo', exact: true })
            .waitFor({ state: 'hidden' });
        await page.unroute(`${root}/settings/profile`);
        await page.goto(memberUrl);
        assert.equal(
            await page.locator('.wb-profile-intro > .wb-avatar img').count(),
            0,
            'Removed photo returns to initials',
        );
        console.log(
            'PASS avatar validation, multipart upload, optimization, replacement, public rendering and removal',
        );

        await page.goto(`${root}/topics/preview-first-customer`);
        await page
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await page.waitForURL(/\/experiences#share$/);
        await page.locator('select[name="outcome"]').selectOption('worked');
        const experienceBody =
            'I tested this approach with a small weekly batch and documented the outcome in this synthetic public evidence image.';
        await page.locator('[contenteditable="true"]').fill(experienceBody);
        await page
            .getByText('Add a date or supporting link', { exact: true })
            .click();
        await page
            .locator('input[name="evidence_url"]')
            .fill('ftp://example.test/evidence');
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .press('ControlOrMeta+End');
        await page
            .getByLabel('Upload photo', { exact: true })
            .setInputFiles(blue);
        await page.locator('.wb-editor img').waitFor();
        await loaded(page.locator('.wb-editor img'));
        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await page.locator('#evidence-url-error').waitFor();
        assert.equal(
            await page.locator('.wb-editor img').count(),
            1,
            'Validation preserves uploaded photos',
        );
        assert.ok(
            (
                await page.locator('[contenteditable="true"]').innerText()
            ).includes(experienceBody),
            'Validation preserves text',
        );
        await page
            .locator('input[name="evidence_url"]')
            .fill('https://example.test/evidence');
        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        const article = page
            .locator('main article')
            .filter({ hasText: experienceBody });
        const evidence = article.locator('.wb-rich-text img');
        await loaded(evidence);
        const imageUrl = await evidence.getAttribute('src');
        const response = await context.request.get(imageUrl);
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-type'], /^image\/webp/);
        const experienceUrl = page.url();
        await page.reload();
        await loaded(evidence);
        assert.equal(await evidence.getAttribute('src'), imageUrl);
        await responsiveCaptures('media-experience');
        await page
            .locator('[contenteditable="true"]')
            .press('ControlOrMeta+End');
        await page
            .getByLabel('Upload photo', { exact: true })
            .setInputFiles(grey);
        await page.waitForFunction(
            () => document.querySelectorAll('.wb-editor img').length === 2,
        );
        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await page.waitForFunction(
            () =>
                document.querySelectorAll('main article .wb-rich-text img')
                    .length === 2,
        );
        await page.locator(`.wb-editor img[src="${imageUrl}"]`).click();
        await page
            .getByRole('button', { name: 'Remove photo', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await page.waitForFunction(
            () =>
                document.querySelectorAll('main article .wb-rich-text img')
                    .length === 1,
        );
        assert.notEqual(await evidence.getAttribute('src'), imageUrl);
        const evidencePage = `${root}${new URL(experienceUrl).pathname}`;
        await hideUploadControlsOnVisits(evidencePage);
        await page
            .getByRole('link', { name: 'Back to the method', exact: true })
            .click();
        await page
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        assert.equal(
            await page
                .getByRole('button', { name: 'Photo', exact: true })
                .count(),
            0,
        );
        await page.locator('.wb-editor img').click();
        await page
            .getByRole('button', { name: 'Remove photo', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await evidence.waitFor({ state: 'detached' });
        await page.unroute(evidencePage);
        await page.reload();
        assert.equal(await article.locator('.wb-rich-text img').count(), 0);
        assert.equal(
            await article
                .getByRole('link', { name: 'View shared evidence' })
                .getAttribute('href'),
            'https://example.test/evidence',
        );
        // The same editor also publishes and edits a method with formatting and photos.
        await page.goto(`${root}/topics/create`);
        await page.locator('#title').fill('Sharing a clear visual method');
        await page.locator('#include_method').check();
        await page
            .locator('#method_title')
            .fill('Keep the explanation beside the photo');
        const methodEditor = page.locator('#method_body');
        await methodEditor.fill('Start with a small repeatable action.');
        await methodEditor.press('ControlOrMeta+a');
        await page.getByRole('button', { name: 'Bold', exact: true }).click();
        await methodEditor.press('ArrowRight');
        await methodEditor.press('Enter');
        await page
            .getByRole('button', { name: 'Numbered steps', exact: true })
            .click();
        await page.keyboard.insertText('Show the first action.');
        await page.keyboard.press('Enter');
        await page.keyboard.insertText('Check the result.');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page
            .getByRole('button', { name: 'Add link', exact: true })
            .click();
        await page
            .getByLabel('Link address', { exact: true })
            .fill('https://example.test/reference');
        await page
            .getByRole('button', { name: 'Apply link', exact: true })
            .click();
        // Exercise clipboard image handling, including text retention on a failed upload.
        await page.getByLabel('Upload photo', { exact: true }).setInputFiles({
            name: 'invalid.svg',
            mimeType: 'image/svg+xml',
            buffer: Buffer.from('<svg></svg>'),
        });
        await page
            .getByText('Choose a JPEG, PNG or WebP photo', { exact: false })
            .waitFor();
        await methodEditor.evaluate((element, base64) => {
            const bytes = Uint8Array.from(atob(base64), (character) =>
                character.charCodeAt(0),
            );
            const clipboardData = new DataTransfer();
            clipboardData.items.add(
                new File([bytes], 'clipboard.png', { type: 'image/png' }),
            );
            element.dispatchEvent(
                new ClipboardEvent('paste', {
                    clipboardData,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        }, blue.buffer.toString('base64'));
        await loaded(page.locator('.wb-editor img'));
        await page.locator('.wb-editor img').click();
        await page
            .getByLabel('Describe this photo for people who cannot see it')
            .fill('The completed first step');
        await page
            .getByRole('button', {
                name: 'Publish topic & method',
                exact: true,
            })
            .click();
        await page.waitForURL(/sharing-a-clear-visual-method$/);
        const methodArticle = page
            .locator('article')
            .filter({ hasText: 'Keep the explanation beside the photo' });
        await methodArticle.locator('strong').first().waitFor();
        assert.equal(await methodArticle.locator('ol li').count(), 2);
        assert.equal(
            await methodArticle
                .getByRole('link', {
                    name: 'https://example.test/reference',
                    exact: true,
                })
                .getAttribute('href'),
            'https://example.test/reference',
        );
        await loaded(methodArticle.getByAltText('The completed first step'));
        await responsiveCaptures('rich-method');
        await methodArticle
            .getByRole('link', { name: 'Edit method', exact: true })
            .click();
        await page.locator('.wb-editor img').waitFor();
        assert.equal(await page.locator('.wb-editor ol li').count(), 2);
        await page.locator('.wb-editor img').click();
        await page
            .getByRole('button', { name: 'Remove photo', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await methodArticle.waitFor();
        assert.equal(
            await methodArticle.locator('.wb-rich-text img').count(),
            0,
        );
        console.log(
            'PASS shared method editor: bold, numbered steps, links, clipboard photos, alt text, editing and removal',
        );
        await context.clearCookies();
        await page.goto(experienceUrl);
        await article.waitFor();
        assert.equal(
            await page
                .getByRole('button', { name: 'Photo', exact: true })
                .count(),
            0,
            'Guests cannot upload',
        );
        assert.deepEqual(errors, [], 'No media browser runtime errors');
        console.log(
            'PASS evidence multipart submission, validation recovery, optimized public image, replacement, removal and responsive light/dark layouts',
        );
    } catch (error) {
        await page
            .screenshot({
                path: `${output}/media-flow-failure.png`,
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
