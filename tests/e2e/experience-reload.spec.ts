import { expect, login, test } from './fixtures';

test('a stale experience can reload the changed method and submit after review', async ({
    page,
    browser,
    actors,
}) => {
    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    const ownerContext = await browser.newContext();
    try {
        await login(page, actors.contributor);
        await page.goto(`${methodUrl}#share`);
        const revision = await page
            .locator('input[name="method_revision"]')
            .inputValue();
        const body =
            'I tried this approach with a small project and recorded the result.';
        await page.getByLabel('What was your result?').selectOption('worked');
        await page.getByRole('textbox', { name: 'How did it go?' }).fill(body);

        const owner = await ownerContext.newPage();
        await login(owner, actors.owner);
        await owner.goto(`${methodUrl}/edit`);
        await owner
            .getByLabel('Method title')
            .fill('Updated approach to review');
        await owner
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await expect(owner).toHaveURL(new RegExp(`${methodUrl}$`));

        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(page.getByRole('alert')).toContainText(
            'The method changed',
        );
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(body);
        await page
            .getByRole('link', {
                name: 'Copy your response and reload before trying again',
            })
            .click();
        await expect(
            page.locator('input[name="method_revision"]'),
        ).not.toHaveValue(revision);
        await expect(
            page.getByRole('heading', {
                name: 'Updated approach to review',
                exact: true,
            }),
        ).toBeVisible();
        await page
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await page.getByLabel('What was your result?').selectOption('worked');
        await page.getByRole('textbox', { name: 'How did it go?' }).fill(body);
        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(
            page.locator('#experiences').getByRole('article'),
        ).toContainText(body);
    } finally {
        await ownerContext.close();
    }
});
