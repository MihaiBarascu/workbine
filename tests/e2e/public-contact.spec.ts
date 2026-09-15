import { expect, login, test } from './fixtures';

test('public contact details can be added and are visible on the member profile', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    await page.goto('/settings/profile');

    await page
        .getByLabel('Public contact email (optional)')
        .fill('public-contact@example.test');
    await page.locator('[data-test="add-social-link"]').click();
    await page
        .locator('[data-test="social-platform-0"]')
        .selectOption('linkedin');
    await page
        .locator('[data-test="social-url-0"]')
        .fill('https://www.linkedin.com/in/workbine-example');
    await page.locator('[data-test="add-social-link"]').click();
    await page
        .locator('[data-test="social-platform-1"]')
        .selectOption('github');
    await page
        .locator('[data-test="social-url-1"]')
        .fill('https://github.com/workbine-example');

    await page.locator('[data-test="update-profile-button"]').click();
    await expect(page.getByText('Your profile has been saved.')).toBeVisible();

    await page.goto(`/members/${actors.owner.username}`);
    await expect(page.getByRole('link', { name: 'Email' })).toHaveAttribute(
        'href',
        'mailto:public-contact@example.test',
    );
    await expect(
        page.getByRole('link', {
            name: 'LinkedIn (opens in a new tab)',
            exact: true,
        }),
    ).toHaveAttribute(
        'href',
        'https://www.linkedin.com/in/workbine-example',
    );
    await expect(
        page.getByRole('link', {
            name: 'GitHub (opens in a new tab)',
            exact: true,
        }),
    ).toHaveAttribute('href', 'https://github.com/workbine-example');
});
