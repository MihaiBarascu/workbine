import { expect, login, test } from './fixtures';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('method previews open stable detail pages and legacy anchors redirect', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);

    // Add ten isolated records through the existing fixture helper so this
    // pagination check stays bounded and does not spend time on ten UI writes.
    const { stdout } = await exec('php', [
        'tests/e2e/seed.php',
        'add-method-pages',
        actors.token,
    ]);
    const { updateId } = JSON.parse(stdout) as { updateId: number };

    const detailUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    await page.goto(`/topics/${actors.topic.slug}`);
    await expect(
        page.getByRole('link', { name: 'Next', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/\/topics\/[^/]+\?page=2$/);
    await expect(
        page.getByRole('link', { name: actors.method.title, exact: true }),
    ).toBeVisible();
    await page
        .getByRole('link', { name: actors.method.title, exact: true })
        .click();
    await expect(page).toHaveURL(detailUrl);
    await expect(
        page.getByRole('heading', { name: actors.method.title, exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText(
            'Agree the scope, show a sample and measure the result.',
            { exact: true },
        ),
    ).toBeVisible();

    await page.goto(`/topics/${actors.topic.slug}#method-update-${updateId}`);
    await expect(page).toHaveURL(`${detailUrl}#method-update-${updateId}`);
    await expect(page.locator(`#method-update-${updateId}`)).toBeInViewport();

    // The old topic hash remains a compatibility entry point for shared links.
    const methodId = detailUrl.match(/\/methods\/(\d+)$/)?.[1];
    expect(methodId).toBeTruthy();
    await page.goto(`/topics/${actors.topic.slug}#method-${methodId}`);
    await expect(page).toHaveURL(detailUrl);
    await expect(
        page.getByRole('heading', { name: actors.method.title, exact: true }),
    ).toBeVisible();
});
