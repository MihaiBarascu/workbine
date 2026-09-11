// Only the disposable CI application. Never point these mutation tests at production.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const requireBrowser = createRequire('/tmp/workbine-browser/package.json');
const { chromium } = requireBrowser('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1080 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Read only after a full navigation/reload: Inertia's initial payload is not
    // rewritten by every client-side visit.
    async function initialProps() {
        return page.evaluate(() => {
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
    }
    async function rejectUsername(value, reason) {
        const input = page.locator('input[name="username"]');
        const previousUsername = await input.inputValue();
        await input.fill(value);
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page.locator('#username-error').waitFor();
        assert.equal(await input.getAttribute('aria-invalid'), 'true', reason);
        assert.match(await page.locator('#username-error').innerText(), /\S/);
        assert.ok(
            (await input.getAttribute('aria-describedby'))
                .split(' ')
                .includes('username-error'),
            'Username error is associated with its input',
        );
        await page.reload();
        await input.waitFor();
        assert.equal(
            await input.inputValue(),
            previousUsername,
            `${reason}: rejected username must not be saved`,
        );
    }
    async function inspect(name) {
        await page.locator('.wb-public main').waitFor();
        assert.equal(
            await page.locator('[data-slot="sidebar-trigger"]').count(),
            0,
            'No starter sidebar',
        );
        assert.equal(
            await page
                .locator(
                    'a[href="https://github.com/laravel/react-starter-kit"]',
                )
                .count(),
            0,
        );
        assert.equal(
            await page.locator('main h1').count(),
            1,
            'One page title',
        );
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            true,
            name + ' horizontal overflow',
        );
        const tokens = await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return {
                dark: document.documentElement.classList.contains('dark'),
                background: style.getPropertyValue('--background').trim(),
                primary: style.getPropertyValue('--primary').trim(),
            };
        });
        assert.equal(
            tokens.background,
            tokens.dark ? '#16181d' : '#f8f9fb',
            name + ' neutral canvas',
        );
        assert.equal(
            tokens.primary,
            tokens.dark ? '#adc3ff' : '#315ed7',
            name + ' consistent blue accent',
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
    async function login(
        email = 'preview-contributor@example.test',
        password = 'preview-only-password',
    ) {
        await page.goto(`${root}/login`);
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
    }
    async function logout() {
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page
            .getByRole('menuitem', { name: 'Log out', exact: true })
            .click();
        await page.getByRole('link', { name: 'Log in', exact: true }).waitFor();
    }
    try {
        await page.goto(`${root}/topics/preview-first-customer`);
        const otherMember = (await initialProps()).topic.user;
        assert.match(otherMember.username, /^[a-z][a-z0-9-]{2,29}$/);
        for (const [path, name] of [
            ['/login', 'login'],
            ['/register', 'register'],
            ['/forgot-password', 'forgot-password'],
            [
                '/reset-password/preview-token?email=preview@example.test',
                'reset-password',
            ],
        ]) {
            await page.goto(root + path);
            await inspect(name + '-desktop');
            await page.setViewportSize({ width: 320, height: 812 });
            await inspect(name + '-mobile');
            await page.setViewportSize({ width: 1440, height: 1080 });
        }
        await page.goto(`${root}/login`);
        await page
            .locator('input[name="email"]')
            .fill('preview-contributor@example.test');
        await page.locator('input[name="password"]').fill('wrong-password');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page
            .getByText('These credentials do not match our records.')
            .waitFor();
        await inspect('login-validation-error');
        await login();
        await page.waitForURL(/\/topics$/);
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page.getByRole('menuitem', { name: 'Account settings' }).click();
        await page.locator('textarea[name="bio"]').waitFor();
        await page.reload();
        const initialMember = (await initialProps()).auth.user;
        assert.ok(Number.isInteger(initialMember.id));
        assert.match(initialMember.username, /^[a-z][a-z0-9-]{2,29}$/);
        assert.notEqual(initialMember.username, otherMember.username);
        await inspect('settings-profile-desktop');
        await page
            .locator('input[name="name"]')
            .fill('Sam — a contributor with a long public display name');
        const bio =
            'I simplify weekly product imports and share the details. <script>window.unsafe = true</script>';
        await page.locator('textarea[name="bio"]').fill(bio);
        await page.locator('input[name="location"]').fill('Pitesti, Romania');
        await page
            .locator('input[name="website"]')
            .fill('https://example.com/my-work');
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: 'Your profile has been saved.' })
            .waitFor();
        await page.reload();
        assert.equal(
            await page.locator('textarea[name="bio"]').inputValue(),
            bio,
        );
        assert.equal(
            await page.locator('input[name="username"]').inputValue(),
            initialMember.username,
            'Changing the display name must keep the username',
        );
        await rejectUsername('invalid username', 'Spaces are invalid');
        await rejectUsername(
            otherMember.username,
            'Another member already owns this username',
        );
        const username = 'sam-practical-advice-2026-test';
        assert.equal(username.length, 30, 'Exercise the maximum handle length');
        await page.locator('input[name="username"]').fill(username);
        assert.equal(
            await page.locator('#username-link').innerText(),
            `Your profile: workbine.com/members/${username}`,
            'The public URL preview follows the edited username',
        );
        await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await page
            .getByRole('status')
            .filter({ hasText: 'Your profile has been saved.' })
            .waitFor();
        await page.reload();
        assert.equal(
            await page.locator('input[name="username"]').inputValue(),
            username,
            'The renamed username persists after reload',
        );
        const profilePath = `/members/${username}`;
        for (const label of [
            'View public profile',
            'See your public profile',
        ]) {
            assert.equal(
                await page
                    .getByRole('link', { name: label, exact: true })
                    .getAttribute('href'),
                profilePath,
                `${label} uses the saved username`,
            );
        }
        await page.setViewportSize({ width: 320, height: 812 });
        await inspect('settings-username-small');
        await page.setViewportSize({ width: 375, height: 812 });
        await inspect('settings-profile-mobile');
        await page
            .getByRole('link', { name: 'View public profile', exact: true })
            .click();
        await page.locator('#member-name').waitFor();
        const profileUrl = page.url().split('?')[0];
        assert.equal(profileUrl, root + profilePath);
        await page.getByText(`@${username}`, { exact: true }).waitFor();
        await inspect('member-mobile');
        await page.setViewportSize({ width: 320, height: 812 });
        await inspect('member-username-small');
        await page.setViewportSize({ width: 1440, height: 1080 });
        await inspect('member-desktop');
        assert.equal(
            await page.evaluate(() => window.unsafe),
            undefined,
            'Bio must be escaped',
        );
        for (const view of ['topics', 'experiences', 'methods']) {
            const tab = page.locator(
                `nav[aria-label="Profile contributions"] a[href$="view=${view}"]`,
            );
            assert.equal(
                await tab.getAttribute('href'),
                `${profilePath}?view=${view}`,
                'Contribution tabs use the current username',
            );
            await tab.click();
            await page.waitForURL(`${profileUrl}?view=${view}`);
            await page
                .locator(
                    `nav[aria-label="Profile contributions"] a[aria-current="page"]`,
                )
                .waitFor();
        }
        // Exercise the actual clipboard-denied path, without relying on OS clipboard permissions.
        await page.evaluate(() =>
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async () => {
                        throw new Error('Denied in test');
                    },
                },
            }),
        );
        await page
            .getByRole('button', { name: 'Copy link', exact: true })
            .click();
        await page.getByRole('textbox', { name: 'Link to copy' }).waitFor();
        assert.equal(
            await page
                .getByRole('textbox', { name: 'Link to copy' })
                .inputValue(),
            profileUrl,
        );
        const previousUsernameResponse = await context.request.get(
            `${root}/members/${initialMember.username}`,
            { maxRedirects: 0 },
        );
        assert.equal(
            previousUsernameResponse.status(),
            404,
            'The previous username does not redirect after a rename',
        );
        const response = await page.goto(
            `${root}/members/${initialMember.id}?view=topics&page=2`,
        );
        await page.locator('#member-name').waitFor();
        const redirectedRequest = response.request().redirectedFrom();
        assert.ok(redirectedRequest, 'The numeric profile URL must redirect');
        assert.equal(
            (await redirectedRequest.response()).status(),
            301,
            'Numeric profile addresses redirect permanently',
        );
        const canonicalUrl = new URL(page.url());
        assert.equal(canonicalUrl.pathname, profilePath);
        assert.equal(canonicalUrl.searchParams.get('view'), 'topics');
        assert.equal(canonicalUrl.searchParams.get('page'), '2');
        const props = await initialProps();
        assert.equal(props.member.id, initialMember.id);
        assert.equal(props.member.username, username);
        assert.equal(props.view, 'topics');
        assert.equal(props.contributions.current_page, 2);
        console.log(
            'PASS username validation, rename persistence, canonical links and numeric 301 redirect preserving contribution filters and pagination.',
        );
        await page.goto(`${root}/settings/security`);
        await page.waitForURL(/confirm-password/);
        await inspect('confirm-password-desktop');
        await page
            .locator('input[name="password"]')
            .fill('preview-only-password');
        await page
            .getByRole('button', { name: 'Confirm password', exact: true })
            .click();
        await page.waitForURL(/settings\/security$/);
        await page
            .getByRole('heading', { name: 'Update password', exact: true })
            .waitFor();
        await inspect('settings-security-desktop');
        await page.setViewportSize({ width: 320, height: 812 });
        await inspect('settings-security-mobile');
        await page
            .getByRole('button', { name: 'Enable 2FA', exact: true })
            .click();
        await page.getByRole('dialog').waitFor();
        await page.screenshot({
            path: `${output}/two-factor-setup-mobile.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.goto(`${root}/settings/appearance`);
        await page.getByRole('button', { name: /Dark/ }).click();
        await page.waitForFunction(() =>
            document.documentElement.classList.contains('dark'),
        );
        await inspect('settings-appearance-small-dark');
        await page.reload();
        assert.equal(
            await page
                .getByRole('button', { name: /Dark/ })
                .getAttribute('aria-pressed'),
            'true',
        );
        await page.goto(profileUrl);
        await inspect('member-small-dark');
        await page.goto(`${root}/settings/appearance`);
        await page.setViewportSize({ width: 1440, height: 1080 });
        await page.getByRole('button', { name: /Light/ }).click();
        await page.waitForFunction(
            () => !document.documentElement.classList.contains('dark'),
        );
        await inspect('settings-appearance-desktop');
        await page.goto(`${root}/settings/profile`);
        await page.locator('[data-test="delete-user-button"]').click();
        await page.getByRole('dialog').waitFor();
        await page.screenshot({
            path: `${output}/delete-account-dialog.png`,
            fullPage: true,
            animations: 'disabled',
        });
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await logout();
        await page.goto(profileUrl);
        await page.locator('#member-name').waitFor();
        assert.equal(
            await page
                .getByRole('link', { name: 'Edit profile', exact: true })
                .count(),
            0,
        );
        const publicPage = await page.content();
        assert.equal(
            publicPage.includes('preview-contributor@example.test'),
            false,
            'No private email in public response',
        );
        assert.equal(await page.evaluate(() => window.unsafe), undefined);
        // Registration remains functional in the branded auth shell.
        await page.goto(`${root}/register`);
        await page.locator('input[name="name"]').fill('New community member');
        await page
            .locator('input[name="email"]')
            .fill('new-member@example.test');
        await page
            .locator('input[name="password"]')
            .fill('safe-preview-only-password-27!');
        await page
            .locator('input[name="password_confirmation"]')
            .fill('safe-preview-only-password-27!');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/topics$/);
        await page.goto(`${root}/email/verify`);
        await page.locator('.wb-auth-form').waitFor();
        await inspect('verify-email-desktop');
        await page.goto(`${root}/settings/profile`);
        const newMember = (await initialProps()).auth.user;
        assert.match(newMember.username, /^[a-z][a-z0-9-]{2,29}$/);
        assert.notEqual(newMember.username, username);
        await page.getByRole('button', { name: 'Account menu' }).click();
        await page.getByRole('menuitem', { name: 'My public profile' }).click();
        await page.waitForURL(`${root}/members/${newMember.username}`);
        await page
            .getByRole('heading', {
                name: 'Your next contribution starts here',
            })
            .waitFor();
        await inspect('new-member-empty-profile');
        await logout();
        // Seeded two-factor fixture validates both branded challenge states.
        await login('preview-two-factor@example.test');
        await page.waitForURL(/two-factor-challenge/);
        await page.setViewportSize({ width: 375, height: 812 });
        await inspect('two-factor-challenge-mobile');
        await page
            .getByRole('button', {
                name: 'login using a recovery code',
                exact: true,
            })
            .click();
        await inspect('recovery-code-mobile');
        await page
            .locator('input[name="recovery_code"]')
            .fill('preview-recovery-code');
        await page
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
        await page.waitForURL(/\/topics$/);
        // A newly generated topic draft is visible in the branded creation form.
        await page.goto(
            `${root}/topics/create?title=My%20practical%20question`,
        );
        await page.locator('input[name="title"]').waitFor();
        assert.equal(
            await page.locator('input[name="title"]').inputValue(),
            'My practical question',
        );
        await inspect('topic-create-mobile');
        await page.goto(`${root}/topics/preview-first-customer/methods/create`);
        await page.locator('input[name="title"]').waitFor();
        await inspect('method-create-mobile');
        assert.deepEqual(
            errors,
            [],
            'No client runtime errors across member/account/auth screens',
        );
        console.log(
            'PASS branded account/profile/auth inventory, public privacy, persistence, theme, dropdown logout, registration, 2FA recovery and clipboard fallback.',
        );
    } catch (error) {
        await page
            .screenshot({
                path: `${output}/profile-flow-failure.png`,
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
