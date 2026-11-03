import { expect, test } from './fixtures';

test('mobile discovery header hides search after scrolling and restores it at the top', async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/topics');

    const shell = page.locator('.wb-discovery-shell');
    const header = page.locator('.wb-topbar');
    const search = page.locator('.wb-universe-search');

    await expect(search).toBeVisible();
    const expandedHeight = await header.evaluate(
        (element) => element.getBoundingClientRect().height,
    );

    await page.evaluate(() => {
        // Keep the test independent of the number of published topics.
        document.body.style.minHeight = '2400px';
        window.scrollTo(0, 350);
    });
    await expect(shell).toHaveClass(/is-mobile-scrolled/);
    await expect(search).toBeHidden();
    await expect(
        page.getByRole('button', { name: 'Open navigation' }),
    ).toBeVisible();
    const compactHeight = await header.evaluate(
        (element) => element.getBoundingClientRect().height,
    );
    expect(compactHeight).toBeLessThan(expandedHeight);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(shell).not.toHaveClass(/is-mobile-scrolled/);
    await expect(search).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 350));
    await expect(search).toBeVisible();
});
