import { expect, login, test } from './fixtures';

test('a useful method can lead to a private contextual conversation', async ({
    page,
    actors,
}, testInfo) => {
    await login(page, actors.contributor);

    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    await page.goto(methodUrl);
    await page
        .getByRole('link', { name: 'Message author', exact: true })
        .click();

    await expect(
        page.getByRole('heading', { name: actors.owner.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(actors.method.title, { exact: true })).toBeVisible();

    const firstMessage = `I found your method useful and wanted to ask about the scope. ${actors.token}`;
    await page.getByLabel('Message', { exact: true }).fill(firstMessage);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page).toHaveURL(/\/messages\/\d+$/);
    const conversationPath = new URL(page.url()).pathname;

    await expect(page.getByText(firstMessage, { exact: true })).toBeVisible();
    await expect(page.getByText(actors.method.title, { exact: true })).toBeVisible();

    await login(page, actors.owner);
    await page.goto('/messages');
    await expect(page.getByText(actors.contributor.name, { exact: true })).toBeVisible();
    await expect(page.getByLabel('1 unread messages')).toBeVisible();
    await page.getByText(actors.contributor.name, { exact: true }).click();
    await expect(page).toHaveURL(conversationPath);
    await expect(page.getByText(firstMessage, { exact: true })).toBeVisible();
    await expect(page.getByText(actors.method.title, { exact: true })).toBeVisible();

    const reply = `The smallest useful version is to start with the workflow you already have. ${actors.token}`;
    await page.getByLabel('Message', { exact: true }).fill(reply);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText(reply, { exact: true })).toBeVisible();

    await testInfo.attach('direct-messaging-conversation', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(page.getByText('Messaging is paused', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unblock', exact: true })).toBeVisible();

    await login(page, actors.contributor);
    await page.goto(conversationPath);
    await expect(page.getByText('Messaging is paused', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
});
