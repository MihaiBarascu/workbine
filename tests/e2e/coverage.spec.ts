import { expect, login, test } from './fixtures';

test('guest public pages expose accessible policy footer and GitHub link', async ({
    page,
}) => {
    for (const viewport of [
        { width: 375, height: 812 },
        { width: 1440, height: 1080 },
    ]) {
        await page.setViewportSize(viewport);
        for (const path of ['/topics', '/privacy', '/terms']) {
            await page.goto(path);
            await expect(page.locator('main h1')).toHaveCount(1);
            await expect(page.locator('footer')).toBeVisible();
            await expect(
                page
                    .locator('footer')
                    .getByRole('link', { name: 'Privacy', exact: true }),
            ).toHaveAttribute('href', '/privacy');
            await expect(
                page
                    .locator('footer')
                    .getByRole('link', { name: 'Terms', exact: true }),
            ).toHaveAttribute('href', '/terms');
            await expect(
                page.locator(
                    'a[aria-label="Workbine on GitHub (opens in a new tab)"]',
                ),
            ).toHaveAttribute(
                'href',
                'https://github.com/MihaiBarascu/workbine',
            );
            await expect(
                page.locator(
                    'a[aria-label="Workbine on GitHub (opens in a new tab)"]',
                ),
            ).toHaveAttribute('target', '_blank');
            await expect(
                page.locator(
                    'a[aria-label="Workbine on GitHub (opens in a new tab)"]',
                ),
            ).toHaveAttribute('rel', /noopener/);
            await expect
                .poll(() =>
                    page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <=
                            window.innerWidth + 1,
                    ),
                )
                .toBe(true);
        }
    }
});

test('member can change password and relogin with the new password', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    await page.goto('/settings/security');
    if (/confirm-password/.test(page.url())) {
        await page
            .getByLabel('Password', { exact: true })
            .fill(actors.owner.password);
        await page
            .getByRole('button', { name: 'Confirm password', exact: true })
            .click();
    }
    await expect(page).toHaveURL(/\/settings\/security$/);

    const newPassword = `updated-pilot-password-${Date.now()}!`;
    await page
        .getByLabel('Current password', { exact: true })
        .fill(actors.owner.password);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page
        .getByLabel('Confirm password', { exact: true })
        .fill(newPassword);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
        page.getByText('Password updated.', { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/security$/);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/(?:topics)?(?:[?#]|$)/);

    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(actors.owner.email);
    await page
        .getByLabel('Password', { exact: true })
        .fill(actors.owner.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
        page.getByText(/these credentials do not match/i),
    ).toBeVisible();

    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/topics$/);
});

test('member can recover from a bad deletion password and delete the account', async ({
    browser,
    page,
    actors,
}) => {
    await login(page, actors.contributor);
    await page.goto('/settings/profile');
    await page
        .getByRole('button', { name: 'Delete account', exact: true })
        .last()
        .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Password').fill('wrong-pilot-password');
    await dialog
        .getByRole('button', { name: 'Delete account', exact: true })
        .click();
    await expect(
        dialog.getByText('The password is incorrect.', { exact: true }),
    ).toBeVisible();

    await dialog.getByPlaceholder('Password').fill(actors.contributor.password);
    await dialog
        .getByRole('button', { name: 'Delete account', exact: true })
        .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
        page.getByRole('link', { name: 'Log in', exact: true }),
    ).toBeVisible();

    await page.goto('/login');
    await page
        .getByLabel('Email address', { exact: true })
        .fill(actors.contributor.email);
    await page
        .getByLabel('Password', { exact: true })
        .fill(actors.contributor.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
        page.getByText(/these credentials do not match/i),
    ).toBeVisible();

    const ownerContext = await browser.newContext();
    try {
        const ownerPage = await ownerContext.newPage();
        await login(ownerPage, actors.owner);
        const deletedProfile = await ownerPage.goto(
            `/members/${actors.contributor.username}`,
        );
        expect(deletedProfile?.status()).toBe(404);
    } finally {
        await ownerContext.close();
    }
});

test('changing the account email requires verification before contributing', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    await page.goto('/settings/profile');
    const replacementEmail = `pilot-email-${Date.now()}@example.test`;
    await page
        .getByLabel('Email address', { exact: true })
        .fill(replacementEmail);
    await page
        .getByRole('button', { name: 'Save changes', exact: true })
        .click();
    await expect(
        page.getByText('Your email address is unverified.'),
    ).toBeVisible();
    await expect(
        page.getByText('A new verification link has been sent.'),
    ).toBeVisible();

    await page.goto('/topics/create');
    await expect(page).toHaveURL(/\/email\/verify$/);

    await page.goto('/settings/profile');
    await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(
        replacementEmail,
    );
});
