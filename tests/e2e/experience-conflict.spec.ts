import { expect, login, test } from './fixtures';

const conflictMessage =
    'Your response changed or was removed while you were editing. Copy your draft and reload the latest response before trying again.';

async function openResponseEditor(
    page: Parameters<typeof login>[0],
    methodUrl: string,
) {
    await page.goto(`${methodUrl}#share`);
    await expect(
        page.getByRole('textbox', { name: 'How did it go?' }),
    ).toBeVisible();
}

async function publishResponse(
    page: Parameters<typeof login>[0],
    methodUrl: string,
    body: string,
) {
    await openResponseEditor(page, methodUrl);
    await page.getByLabel('What was your result?').selectOption('worked');
    await page.getByRole('textbox', { name: 'How did it go?' }).fill(body);
    await page
        .getByRole('button', { name: 'Publish my response', exact: true })
        .click();
    await expect(
        page.locator('#experiences').getByRole('article').filter({
            hasText: body,
        }),
    ).toBeVisible();
}

test('a stale new-response draft cannot replace the response created in another tab', async ({
    page,
    actors,
}, testInfo) => {
    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    const currentPage = await page.context().newPage();
    try {
        await login(page, actors.contributor);
        await page.goto(`${methodUrl}?outcome=worked#share`);
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toBeVisible();
        const staleBody =
            'This new response draft was opened before the other tab published.';
        await page.getByLabel('What was your result?').selectOption('worked');
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(staleBody);
        await expect(
            page.locator('input[name="experience_revision"]'),
        ).toHaveValue('new');

        const currentBody =
            'This response from the second tab is the version that must remain.';
        await publishResponse(currentPage, methodUrl, currentBody);

        // Filtering refreshes the response list and own-response props, but the
        // mounted draft must keep both its text and original revision.
        await page
            .getByRole('link', {
                name: /^Worked for me:/,
            })
            .click();
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(staleBody);
        await expect(
            page.locator('input[name="experience_revision"]'),
        ).toHaveValue('new');

        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(page.getByRole('alert')).toContainText(conflictMessage);
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(staleBody);
        await expect(
            page.locator('input[name="experience_revision"]'),
        ).toHaveValue('new');
        await expect(
            page.locator('#experiences').getByRole('article').filter({
                hasText: currentBody,
            }),
        ).toBeVisible();
        await testInfo.attach('stale-new-response-conflict', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });

        await page
            .getByRole('link', {
                name: 'Copy your response and reload before trying again',
                exact: true,
            })
            .click();
        await page
            .getByRole('link', { name: 'Edit my experience', exact: true })
            .click();
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(currentBody);
        await expect(
            page.locator('input[name="experience_revision"]').first(),
        ).not.toHaveValue('new');
        const reviewedBody =
            'After reloading, I deliberately updated the response I reviewed.';
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(reviewedBody);
        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(
            page.locator('#experiences').getByRole('article').filter({
                hasText: reviewedBody,
            }),
        ).toBeVisible();
    } finally {
        await currentPage.close();
    }
});

test('a stale editor cannot overwrite a response updated in another tab', async ({
    page,
    actors,
}) => {
    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    const currentPage = await page.context().newPage();
    try {
        await login(page, actors.contributor);
        const initialBody =
            'This initial response gives both editor tabs the same starting revision.';
        await publishResponse(page, methodUrl, initialBody);
        await openResponseEditor(page, methodUrl);
        await openResponseEditor(currentPage, methodUrl);

        const staleUpdate =
            'This stale edit must not overwrite the update from the other tab.';
        const originalRevision = await page
            .locator('input[name="experience_revision"]')
            .first()
            .inputValue();
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(staleUpdate);

        const currentUpdate =
            'This newer response was saved from the second browser tab.';
        await currentPage
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(currentUpdate);
        await currentPage
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(
            currentPage.locator('#experiences').getByRole('article').filter({
                hasText: currentUpdate,
            }),
        ).toBeVisible();

        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(page.getByRole('alert')).toContainText(conflictMessage);
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(staleUpdate);
        await expect(
            page.locator('input[name="experience_revision"]').first(),
        ).toHaveValue(originalRevision);

        await page
            .getByRole('link', {
                name: 'Copy your response and reload before trying again',
                exact: true,
            })
            .click();
        await page
            .getByRole('link', { name: 'Edit my experience', exact: true })
            .click();
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(currentUpdate);
        const reviewedUpdate =
            'I reviewed the newer response after reloading and saved this update.';
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(reviewedUpdate);
        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(
            page.locator('#experiences').getByRole('article').filter({
                hasText: reviewedUpdate,
            }),
        ).toBeVisible();
    } finally {
        await currentPage.close();
    }
});

test('a stale editor cannot recreate a response deleted in another tab', async ({
    page,
    actors,
}) => {
    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    const currentPage = await page.context().newPage();
    try {
        await login(page, actors.contributor);
        await publishResponse(
            page,
            methodUrl,
            'This response exists before both tabs open their own editor.',
        );
        await openResponseEditor(page, methodUrl);
        await openResponseEditor(currentPage, methodUrl);
        const deletedDraft =
            'This edit must remain visible after conflict but cannot recreate the deleted response.';
        const deletedRevision = await page
            .locator('input[name="experience_revision"]')
            .first()
            .inputValue();
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(deletedDraft);
        currentPage.once('dialog', (dialog) => dialog.accept());
        await currentPage
            .getByRole('button', { name: 'Remove my response', exact: true })
            .click();
        await expect(
            currentPage.getByRole('heading', {
                name: '0 experiences',
                exact: true,
            }),
        ).toBeVisible();

        await page
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(page.getByRole('alert')).toContainText(conflictMessage);
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(deletedDraft);
        await expect(
            page.locator('input[name="experience_revision"]').first(),
        ).toHaveValue(deletedRevision);
        await expect(
            page.getByRole('heading', { name: '0 experiences', exact: true }),
        ).toBeVisible();

        await page
            .getByRole('link', {
                name: 'Copy your response and reload before trying again',
                exact: true,
            })
            .click();
        await page
            .getByRole('link', { name: 'I tried this', exact: true })
            .click();
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText('');
        const deliberateResponse =
            'This response was created deliberately after reloading the deleted state.';
        await page.getByLabel('What was your result?').selectOption('worked');
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(deliberateResponse);
        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(
            page.locator('#experiences').getByRole('article').filter({
                hasText: deliberateResponse,
            }),
        ).toBeVisible();
    } finally {
        await currentPage.close();
    }
});

test('a stale delete cannot remove a response updated in another tab', async ({
    page,
    actors,
}) => {
    const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
    const currentPage = await page.context().newPage();
    try {
        await login(page, actors.contributor);
        const initialBody =
            'This response is open in both tabs before one tab updates it.';
        await publishResponse(page, methodUrl, initialBody);
        await openResponseEditor(page, methodUrl);
        await openResponseEditor(currentPage, methodUrl);
        const staleRevision = await page
            .locator('input[name="experience_revision"]')
            .first()
            .inputValue();

        const currentBody =
            'This newer response must survive the stale delete request.';
        await currentPage
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(currentBody);
        await currentPage
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(
            currentPage.locator('#experiences').getByRole('article').filter({
                hasText: currentBody,
            }),
        ).toBeVisible();

        page.once('dialog', (dialog) => dialog.accept());
        await page
            .getByRole('button', { name: 'Remove my response', exact: true })
            .click();
        await expect(page.getByRole('alert')).toContainText(conflictMessage);
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(initialBody);
        await expect(
            page.locator('input[name="experience_revision"]').first(),
        ).toHaveValue(staleRevision);
        await expect(
            page.locator('#experiences').getByRole('article').filter({
                hasText: currentBody,
            }),
        ).toBeVisible();

        await page
            .getByRole('link', {
                name: 'Reload the latest response before trying again',
                exact: true,
            })
            .click();
        await page
            .getByRole('link', { name: 'Edit my experience', exact: true })
            .click();
        await expect(
            page.getByRole('textbox', { name: 'How did it go?' }),
        ).toHaveText(currentBody);
        page.once('dialog', (dialog) => dialog.accept());
        await page
            .getByRole('button', { name: 'Remove my response', exact: true })
            .click();
        await expect(
            page.getByRole('heading', { name: '0 experiences', exact: true }),
        ).toBeVisible();
    } finally {
        await currentPage.close();
    }
});
