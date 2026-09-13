import { expect, login, test } from './fixtures';

test('long editor keeps its tools reachable and links the selected lower text', async ({
    page,
    actors,
}, testInfo) => {
    await login(page, actors.owner);
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(`${actors.topic.title} sticky editor`);
    await page.getByRole('checkbox', { name: 'Add my method too' }).check();
    await page
        .getByLabel('Method title')
        .fill('A method with a long explanation');

    const editor = page.getByRole('textbox', { name: 'How you do it' });
    const paragraphs = Array.from(
        { length: 28 },
        (_, index) =>
            `Practical step ${index + 1}: write enough context that another person can repeat the method.`,
    );
    await editor.fill(`${paragraphs.join('\n\n')}\n\nSelect this lower phrase`);
    await editor.locator('p').last().scrollIntoViewIfNeeded();

    await editor.focus();
    await editor.press('Control+End');
    await editor.press('Shift+Control+ArrowLeft');
    await editor.press('Shift+Control+ArrowLeft');
    const headerBottom = await page
        .locator('.wb-topbar')
        .evaluate((element) => element.getBoundingClientRect().bottom);
    const toolsTop = await page
        .locator('.wb-editor-sticky-tools')
        .evaluate((element) => element.getBoundingClientRect().top);
    expect(toolsTop).toBeGreaterThanOrEqual(headerBottom - 1);
    await expect(
        page.getByRole('button', { name: 'Add link', exact: true }),
    ).toBeInViewport();

    await page.getByRole('button', { name: 'Add link', exact: true }).click();
    await expect(page.getByLabel('Link address')).toBeVisible();
    await testInfo.attach('editor-link-options', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });
    await page.getByLabel('Link address').fill('https://example.com/repeat');
    await page.getByRole('button', { name: 'Apply link', exact: true }).click();

    await expect(
        editor.locator('a[href="https://example.com/repeat"]'),
    ).toHaveText('lower phrase');
    expect(
        await page.evaluate(() => {
            const root = document.scrollingElement;
            return root ? root.scrollWidth <= root.clientWidth : true;
        }),
    ).toBe(true);
});
