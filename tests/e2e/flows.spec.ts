import { expect, login, test } from './fixtures';
import { imageFile } from './fixtures';
import type { Page } from '@playwright/test';

async function logout(page: Page) {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/topics(?:[?#]|$)/);
    await expect(
        page.getByRole('link', { name: 'Log in', exact: true }),
    ).toBeVisible();
}

test('verified member can log in and log out', async ({ page, actors }) => {
    await login(page, actors.owner);
    await expect(
        page.getByRole('button', { name: 'Account menu' }),
    ).toBeVisible();
    await logout(page);
});

test('member can create a topic with classification and revisit it', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    const title = `${actors.topic.title} topic-only ${Date.now()}`;
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(title);
    await page
        .getByLabel('A little context')
        .fill('A practical topic created from the browser flow.');
    const category = page.getByLabel(/Category/);
    await category.selectOption('ai');
    await page.getByLabel(/Tags/).fill('browser, practical');
    await page
        .getByRole('button', { name: 'Publish topic', exact: true })
        .click();
    await expect(page).toHaveURL(/\/topics\/[^/]+$/);
    await expect(
        page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Edit topic', exact: true }).click();
    await expect(page.getByLabel(/Tags/)).toHaveValue('browser, practical');
    await expect(page.getByLabel(/Category/)).toHaveValue('ai');
    await page.reload();
    await expect(page.getByLabel(/Tags/)).toHaveValue('browser, practical');
    await expect(page.getByLabel(/Category/)).toHaveValue('ai');
});

test('member can publish a first rich-text method with an inline photo', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    const title = `${actors.topic.title} first method ${Date.now()}`;
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(title);
    await page.getByRole('checkbox', { name: 'Add my method too' }).check();
    await page.getByLabel('Method title').fill('A repeatable browser method');
    await page
        .getByRole('textbox', { name: 'How you do it' })
        .fill('I followed these steps and checked the result carefully.');
    await page
        .getByLabel('Upload photo', { exact: true })
        .setInputFiles(imageFile);
    await expect(page.locator('[contenteditable="true"] img')).toHaveCount(1);
    await page.locator('[contenteditable="true"] img').click();
    await page
        .getByLabel('Describe this photo for people who cannot see it')
        .fill('A small example photo.');
    await page
        .getByRole('button', { name: 'Publish topic & method', exact: true })
        .click();
    await expect(page).toHaveURL(/\/topics\/[^/]+$/);
    await expect(
        page.getByRole('heading', {
            name: 'A repeatable browser method',
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'A small example photo.', exact: true }),
    ).toBeVisible();
    await expect
        .poll(() =>
            page
                .getByRole('img', {
                    name: 'A small example photo.',
                    exact: true,
                })
                .evaluate(
                    (image: HTMLImageElement) =>
                        image.complete && image.naturalWidth > 0,
                ),
        )
        .toBe(true);
    await page.reload();
    await expect(
        page.getByRole('heading', {
            name: 'A repeatable browser method',
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('img', { name: 'A small example photo.', exact: true }),
    ).toBeVisible();
    await expect
        .poll(() =>
            page
                .getByRole('img', {
                    name: 'A small example photo.',
                    exact: true,
                })
                .evaluate(
                    (image: HTMLImageElement) =>
                        image.complete && image.naturalWidth > 0,
                ),
        )
        .toBe(true);
});

test('a second member can share an experience and notify the method recipient', async ({
    browser,
    actors,
}) => {
    const contributorContext = await browser.newContext();
    const ownerContext = await browser.newContext();
    try {
        const contributorPage = await contributorContext.newPage();
        await login(contributorPage, actors.contributor);
        await contributorPage.goto(
            `/topics/${actors.topic.slug}/methods/${actors.method.id}/experiences`,
        );
        await contributorPage
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await contributorPage
            .getByLabel('What was your result?')
            .selectOption('worked');
        await contributorPage
            .getByRole('textbox', { name: 'How did it go?' })
            .fill('The method worked in my own context and saved useful time.');
        await contributorPage
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(
            contributorPage.getByRole('heading', { name: /1 experience/ }),
        ).toBeVisible();

        await contributorPage.reload();
        await expect(
            contributorPage
                .getByRole('article')
                .getByText(
                    'The method worked in my own context and saved useful time.',
                    { exact: true },
                ),
        ).toBeVisible();
        const ownerPage = await ownerContext.newPage();
        await login(ownerPage, actors.owner);
        await ownerPage
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: /Notifications/ })
            .click();
        await expect(
            ownerPage.getByRole('heading', {
                name: 'Notifications',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            ownerPage
                .getByRole('button')
                .filter({ hasText: actors.method.title })
                .first(),
        ).toBeVisible();
        await ownerPage
            .getByRole('button')
            .filter({ hasText: actors.method.title })
            .first()
            .click();
        await expect(ownerPage).toHaveURL(/#experience-\d+$/);
        await expect(
            ownerPage.getByText(
                'The method worked in my own context and saved useful time.',
                { exact: true },
            ),
        ).toBeVisible();
    } finally {
        await contributorContext.close();
        await ownerContext.close();
    }
});

test('member can filter, save, unsave and persist a topic', async ({
    page,
    actors,
}) => {
    await login(page, actors.contributor);
    await page.goto('/topics');
    await page
        .getByRole('searchbox', { name: 'Search topics' })
        .fill(actors.topic.title);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/q=/);
    const card = page
        .locator('article')
        .filter({
            has: page.getByRole('link', {
                name: actors.topic.title,
                exact: true,
            }),
        })
        .first();
    await expect(card).toBeVisible();
    const categoryLink = card.getByRole('link', {
        name: 'AI in Practice',
        exact: true,
    });
    await expect(categoryLink).toHaveAttribute('href', /category=/);
    await categoryLink.click();
    await expect(page).toHaveURL(/category=ai/);
    await page.goto(`/topics/${actors.topic.slug}`);
    await page.getByRole('button', { name: 'Save topic', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Remove saved topic', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole('button', { name: 'Remove saved topic', exact: true }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Remove saved topic', exact: true })
        .click();
    await expect(
        page.getByRole('button', { name: 'Save topic', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole('button', { name: 'Save topic', exact: true }),
    ).toBeVisible();
});

test('only the owner can edit a topic and the owner edit persists', async ({
    page,
    actors,
}) => {
    await login(page, actors.contributor);
    const denied = await page.goto(`/topics/${actors.topic.slug}/edit`);
    expect(denied?.status()).toBe(403);
    await expect(page.getByRole('main')).toBeVisible();

    await login(page, actors.owner);
    await page.goto(`/topics/${actors.topic.slug}/edit`);
    const editedTitle = `${actors.topic.title} updated`;
    await page.getByLabel('Topic').fill(editedTitle);
    await page
        .getByLabel('Context')
        .fill('Updated by the topic owner in the browser flow.');
    await page
        .getByRole('button', { name: 'Save changes', exact: true })
        .click();
    await expect(page).toHaveURL(new RegExp(`/topics/${actors.topic.slug}$`));
    await expect(
        page.getByRole('heading', { name: editedTitle, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole('heading', { name: editedTitle, exact: true }),
    ).toBeVisible();
});
