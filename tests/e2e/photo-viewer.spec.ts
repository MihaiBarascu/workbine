import { expect, imageFile, login, test } from './fixtures';

test('method photos open in a viewer instead of the image address', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(`${actors.topic.title} photos`);
    await page.getByRole('checkbox', { name: 'Add my method too' }).check();
    await page.getByLabel('Method title').fill('A method with three photos');
    await page
        .getByRole('textbox', { name: 'How you do it' })
        .fill('Each photo shows one step. Photo 2 shows the settings.');
    const captions = ['The starting screen', 'The settings', 'The result'];
    await page
        .getByLabel('Upload photos', { exact: true })
        .setInputFiles([imageFile, imageFile, imageFile]);
    for (const [index, caption] of captions.entries())
        await page
            .getByLabel(`Photo ${index + 1} description`, { exact: true })
            .fill(caption);
    await page
        .getByRole('button', { name: 'Move photo 3 earlier', exact: true })
        .click();
    await expect(
        page.getByLabel('Photo 2 description', { exact: true }),
    ).toHaveValue('The result');
    await page
        .getByRole('button', { name: 'Move photo 2 later', exact: true })
        .click();
    await page
        .getByRole('button', { name: 'Publish topic & method', exact: true })
        .click();
    await page
        .getByRole('link', { name: 'A method with three photos', exact: true })
        .click();
    await expect(page).toHaveURL(/\/topics\/[^/]+\/methods\/\d+$/);
    const methodUrl = page.url();

    const gallery = page.getByRole('list', { name: '3 photos' });
    await expect(gallery.getByRole('listitem')).toHaveCount(3);
    // Descriptions remain the photos' text alternatives.
    await expect(
        page.getByRole('img', { name: 'The settings', exact: true }),
    ).toBeVisible();

    await gallery
        .getByRole('link', { name: 'Open photo 2 of 3: The settings' })
        .click();
    const viewer = page.getByRole('dialog', { name: 'Photos' });
    await expect(viewer).toBeVisible();
    await expect(page).toHaveURL(methodUrl);
    await expect(viewer.getByText('2 / 3', { exact: true })).toBeVisible();
    await expect(
        viewer.getByText('The settings', { exact: true }),
    ).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByText('3 / 3', { exact: true })).toBeVisible();
    await expect(viewer.getByText('The result', { exact: true })).toBeVisible();
    // Browsing wraps around, so the last photo leads back to the first.
    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByText('1 / 3', { exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'Photo 3', exact: true }).click();
    await expect(viewer.getByText('3 / 3', { exact: true })).toBeVisible();

    await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(
        viewer.getByRole('button', { name: 'Zoom out', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('0');
    await expect(
        viewer.getByRole('button', { name: 'Zoom in', exact: true }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(page).toHaveURL(methodUrl);
    // Focus returns to the photo that was on screen when the viewer closed.
    await expect(
        gallery.getByRole('link', { name: 'Open photo 3 of 3: The result' }),
    ).toBeFocused();

    await gallery
        .getByRole('link', { name: 'Open photo 1 of 3: The starting screen' })
        .click();
    await viewer.getByRole('button', { name: 'Close photos' }).click();
    await expect(viewer).toBeHidden();
});
