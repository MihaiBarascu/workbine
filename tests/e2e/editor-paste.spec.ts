import { expect, login, test } from './fixtures';

// Synthetic clipboard HTML exercises the actual editor paste pipeline.
test('copied rich text keeps email links and explains simplified content', async ({
    page,
    actors,
}, testInfo) => {
    await login(page, actors.owner);
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(`${actors.topic.title} clipboard`);
    await page.getByRole('checkbox', { name: 'Add my method too' }).check();
    await page.getByLabel('Method title').fill('A copied business method');
    const editor = page.getByRole('textbox', { name: 'How you do it' });
    await editor.focus();
    await editor.evaluate((element) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData(
            'text/html',
            '<h2>Business website</h2><p>Keep <strong>your content</strong> and <a href="https://example.com/guide">the guide</a>.</p><p>Email <a href="mailto:contact@example.com"><strong>contact@example.com</strong></a></p><ul><li><p>Build</p><ul><li><p>Check</p></li></ul></li></ul><pre>npm install\nnpm run build</pre><table><tr><th>Service</th><th>Cost</th></tr><tr><td>Hosting</td><td>Free</td></tr></table><p><a href="ftp://example.com/file">Old download</a></p><img src="https://example.com/photo.png" alt="Example photo"><hr>',
        );
        element.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData,
                bubbles: true,
                cancelable: true,
            }),
        );
    });
    await expect(
        editor.locator('a[href="mailto:contact@example.com"]'),
    ).toHaveText('contact@example.com');
    await expect(
        editor.locator('a[href="https://example.com/guide"]'),
    ).toHaveText('the guide');
    await expect(editor).toContainText('Hosting | Free');
    await expect(editor).toContainText('npm run build');
    await expect(editor.locator('img')).toHaveCount(0);
    await expect(
        page.getByText(/Pasted formatting was simplified/),
    ).toBeVisible();
    await expect(
        page.getByText(/Copied images were not uploaded/),
    ).toBeVisible();
    await expect(
        page.getByText(/The link on “Old download” was removed/),
    ).toBeVisible();
    await testInfo.attach('paste-feedback', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });
    await page
        .getByRole('button', { name: 'Publish topic & method', exact: true })
        .click();
    await expect(page).toHaveURL(/\/topics\/[^/]+$/);
    await expect(
        page.getByRole('heading', {
            name: 'A copied business method',
            exact: true,
        }),
    ).toBeVisible();
    await page.reload();
    const body = page.locator('.wb-rich-text');
    await expect(
        body.getByRole('link', { name: 'contact@example.com' }),
    ).toHaveAttribute('href', 'mailto:contact@example.com');
    await expect(body.getByRole('link', { name: 'the guide' })).toHaveAttribute(
        'href',
        'https://example.com/guide',
    );
    await expect(body).toContainText('Business website');
    await expect(body).toContainText('Hosting | Free');
    await expect(body).toContainText('Old download');
    await expect(body).toContainText('Example photo');
    await expect(body.locator('ul ul')).toHaveCount(1);
});

test('an invalid manually entered link has actionable feedback and keeps the draft', async ({
    page,
    actors,
}) => {
    await login(page, actors.owner);
    await page.goto('/topics/create');
    await page.getByLabel('Topic').fill(`${actors.topic.title} link recovery`);
    await page.getByRole('checkbox', { name: 'Add my method too' }).check();
    await page.getByLabel('Method title').fill('Recoverable draft');
    const editor = page.getByRole('textbox', { name: 'How you do it' });
    await editor.fill('Keep this explanation while fixing the link.');
    await page.getByRole('button', { name: 'Add link', exact: true }).click();
    await page.getByLabel('Link address').fill('mailto:invalid');
    await page.getByRole('button', { name: 'Apply link', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('one email address');
    await expect(editor).toHaveText(
        'Keep this explanation while fixing the link.',
    );
    await page.getByLabel('Link address').fill('mailto:contact@example.com');
    await page.getByRole('button', { name: 'Apply link', exact: true }).click();
    await page
        .getByRole('button', { name: 'Publish topic & method', exact: true })
        .click();
    await expect(page).toHaveURL(/\/topics\/[^/]+$/);
    await expect(page.locator('.wb-rich-text')).toContainText(
        'Keep this explanation while fixing the link.',
    );
    await expect(
        page.locator('.wb-rich-text a[href="mailto:contact@example.com"]'),
    ).toHaveCount(1);
});
