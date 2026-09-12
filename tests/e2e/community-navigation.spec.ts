import { expect, login, test } from './fixtures';

// These scenarios inherit the disposable-origin guard and isolated actors.
test('community navigation retracts without losing routes or keyboard access', async ({ page, context }, testInfo) => {
    test.setTimeout(90_000);
    await page.goto('/topics');
    const sidebar = page.locator('#community-navigation');
    const mobile = (page.viewportSize()?.width ?? 1440) <= 1050;

    if (mobile) {
        const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
        await expect(sidebar).toBeHidden();
        await trigger.click();
        await expect(page.getByRole('dialog', { name: 'Community navigation' })).toBeVisible();
        await expect(page.locator('.wb-shell-body')).toHaveAttribute('inert', '');
        await expect(sidebar.getByRole('button', { name: 'Close navigation', exact: true })).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
        expect(await sidebar.evaluate((element) => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Tab');
        expect(await sidebar.evaluate((element) => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(sidebar).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(page.locator('.wb-shell-body')).not.toHaveAttribute('inert');
        await trigger.click();
        await testInfo.attach('mobile-navigation-open', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });
        await sidebar.getByRole('link', { name: 'Community guide', exact: true }).click();
        await expect(page).toHaveURL(/\/community\/guide$/);
        await expect(sidebar).toBeHidden();
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
        await expect(sidebar.getByRole('link', { name: 'Community guide', exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getByRole('link', { name: 'Explore', exact: true })).not.toHaveAttribute('aria-current');
        await page.getByRole('button', { name: 'Close navigation backdrop', exact: true }).click({ position: { x: 310, y: 400 }, force: true });
        await expect(sidebar).toBeHidden();
    } else {
        await expect(sidebar).toBeVisible();
        const before = await page.locator('#main-content').boundingBox();
        await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
        await expect(sidebar).toBeHidden();
        await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toHaveAttribute('aria-expanded', 'false');
        await expect.poll(async () => (await page.locator('#main-content').boundingBox())?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 100);
        expect((await context.cookies()).find((cookie) => cookie.name === 'sidebar_state')?.value).toBe('false');
        await page.goto('/community/guide');
        await expect(sidebar).toBeHidden();
        await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
        await testInfo.attach('desktop-navigation-retracted', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });
        await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
        await expect(sidebar).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Community guide', exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getByRole('link', { name: 'Explore', exact: true })).not.toHaveAttribute('aria-current');
        await sidebar.getByRole('navigation', { name: 'Categories', exact: true }).getByRole('link').first().click();
        await expect(page).toHaveURL(/\/topics\?category=/);
        await expect(sidebar.getByRole('navigation', { name: 'Categories', exact: true }).locator('[aria-current="page"]')).toHaveCount(1);
    }

    // Drawer state is independent of the persisted desktop preference.
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/login');
    await expect(page.locator('.wb-secondary-shell')).toBeVisible();
    await expect(sidebar).toBeHidden();
    await expect(page.locator('.wb-universe')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await testInfo.attach('shared-login-320', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });
});

test('member pages share the community shell and preserve readable mobile layouts', async ({ page, actors }, testInfo) => {
    test.setTimeout(120_000);
    await login(page, actors.owner);
    const routes = [
        '/saved',
        '/notifications',
        `/members/${actors.owner.username}`,
        '/settings/profile',
        '/settings/security',
        '/settings/appearance',
        '/topics/create',
        `/topics/${actors.topic.slug}`,
        `/topics/${actors.topic.slug}/methods/${actors.method.id}/edit`,
    ];
    for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('.wb-secondary-shell')).toBeVisible();
        await expect(page.locator('main h1')).toHaveCount(1);
        await expect(page.locator('.wb-universe')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    for (const width of [320, 768, 1050, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/settings/profile');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.getByRole('navigation', { name: 'Settings', exact: true })).toBeVisible();
        if (width === 320 || width === 1280) {
            await testInfo.attach(`shared-settings-${width}`, {
                body: await page.screenshot({ fullPage: true }),
                contentType: 'image/png',
            });
        }
    }
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/community/guide');
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await testInfo.attach('shared-guide-dark-mobile', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });
});
