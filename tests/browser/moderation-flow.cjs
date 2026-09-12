const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    assert.equal(process.env.APP_ENV, 'testing');
    const browser = await chromium.launch();
    const root = 'http://127.0.0.1:8002';
    const member = await browser.newPage({
        viewport: { width: 375, height: 812 },
    });
    const admin = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    for (const page of [member, admin])
        page.on('pageerror', (error) => errors.push(error.message));
    async function login(page, email) {
        await page.goto(`${root}/login`);
        await page.locator('input[name=email]').fill(email);
        await page
            .locator('input[name=password]')
            .fill('preview-only-password');
        await page.locator('button[type=submit]').click();
        await page.waitForURL(/\/topics$/);
    }
    async function capture(page, name, width, colorScheme = 'light') {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
            await page.locator('.wb-topbar').count(),
            1,
            'One shared community header',
        );
        assert.equal(
            await page.locator('main').count(),
            1,
            'One main content landmark',
        );
        assert.ok(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name}: no overflow`,
        );
        await page.screenshot({
            path: `/tmp/workbine-ui-preview/${name}.png`,
            fullPage: true,
            animations: 'disabled',
        });
    }
    try {
        await login(member, 'preview-moderation-author@example.test');
        assert.equal(
            (await member.request.get(`${root}/moderation`)).status(),
            403,
        );
        await member.goto(`${root}/topics/create`);
        const title = 'MODERATION_HOLD benign browser fixture';
        await member.locator('input[name=title]').fill(title);
        await member
            .locator('textarea[name=description]')
            .fill(
                'This is harmless synthetic content used to check the review flow.',
            );
        await member.locator('button[type=submit]').click();
        await member
            .getByText(/This submission needs a content review/)
            .first()
            .waitFor();
        assert.equal(
            await member.locator('input[name=title]').inputValue(),
            title,
        );
        await capture(member, 'moderation-held-form-mobile', 375);
        await login(admin, 'preview-moderator@example.test');
        await admin.getByRole('button', { name: 'Account menu' }).click();
        await admin
            .getByRole('menuitem', { name: 'Moderation', exact: true })
            .click();
        await admin
            .getByRole('heading', { name: 'Moderation', exact: true })
            .waitFor();
        await capture(admin, 'moderation-queue-desktop', 1440);
        await admin
            .getByRole('link', { name: /New topic/ })
            .first()
            .click();
        await admin.getByText(title, { exact: true }).waitFor();
        await capture(admin, 'moderation-review-mobile', 375);
        await capture(admin, 'moderation-review-dark', 1440, 'dark');
        await admin.locator('#decision').selectOption('approve');
        await admin
            .locator('#review-note')
            .fill('Benign test content approved after review.');
        await admin.getByRole('button', { name: 'Save decision' }).click();
        await admin.getByText(/Status: approved/).waitFor();
        await member.locator('button[type=submit]').click();
        await member.waitForURL(
            /\/topics\/moderation-hold-benign-browser-fixture$/,
        );
        await member.goto(`${root}/topics/create`);
        await member
            .locator('input[name=title]')
            .fill('MODERATION_OUTAGE retain my draft');
        await member.locator('button[type=submit]').click();
        await member
            .getByText(/Automatic checking is unavailable/)
            .first()
            .waitFor();
        assert.equal(
            await member.locator('input[name=title]').inputValue(),
            'MODERATION_OUTAGE retain my draft',
        );
        await admin.goto(`${root}/moderation`);
        await admin
            .getByRole('link', { name: /New topic/ })
            .first()
            .click();
        await admin.getByText(/No violation has been determined/).waitFor();
        await capture(admin, 'moderation-outage-review-mobile', 375);
        await admin.locator('#decision').selectOption('approve');
        await admin
            .locator('#review-note')
            .fill('Benign draft manually checked during outage.');
        await admin.getByRole('button', { name: 'Save decision' }).click();
        await admin.getByText(/Status: approved/).waitFor();
        await member.locator('button[type=submit]').click();
        await member.waitForURL(/\/topics\/moderation-outage-retain-my-draft$/);
        await member.goto(`${root}/settings/profile`);
        const image = await member.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 320;
            const drawing = canvas.getContext('2d');
            drawing.fillStyle = '#dbeafe';
            drawing.fillRect(0, 0, 480, 320);
            drawing.fillStyle = '#1e3a8a';
            drawing.font = '22px sans-serif';
            drawing.fillText('Harmless test image', 40, 160);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        await member.locator('input[type=file]').setInputFiles({
            name: 'benign.png',
            mimeType: 'image/png',
            buffer: Buffer.from(image, 'base64'),
        });
        await member
            .getByRole('button', { name: 'Save photo', exact: true })
            .click();
        await member
            .getByText(/This submission needs a content review/)
            .first()
            .waitFor();
        await admin.goto(`${root}/moderation`);
        await admin.getByRole('link', { name: /Profile photo/ }).click();
        assert.equal(
            await admin.locator('main img').count(),
            0,
            'Held image requires deliberate reveal',
        );
        await admin
            .getByRole('button', { name: 'Show image for review' })
            .click();
        await admin.locator('main img').waitFor();
        const imageUrl = await admin.locator('main img').getAttribute('src');
        assert.equal(
            (await member.request.get(`${root}${imageUrl}`)).status(),
            403,
        );
        await capture(admin, 'moderation-private-image-mobile', 375);
        await admin.locator('#decision').selectOption('reject');
        await admin
            .locator('#review-note')
            .fill('Synthetic rejection to verify the decision flow.');
        await admin.getByRole('button', { name: 'Save decision' }).click();
        await admin.getByText(/Status: rejected/).waitFor();
        assert.deepEqual(errors, []);
        console.log(
            'PASS: moderation access, held text/image, human approval, resubmission, outage preservation and responsive review pages.',
        );
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
