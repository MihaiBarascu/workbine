import { expect, login, test } from './fixtures';

for (const changedDraft of [false, true]) {
    test(
        changedDraft
            ? 'a changed update survives a lost response and can be published as a new note'
            : 'an identical retry after a lost response confirms the note without duplicating it',
        async ({ page, browser, actors }, testInfo) => {
            test.setTimeout(60_000);
            const contributorContext = await browser.newContext();

            try {
                const contributor = await contributorContext.newPage();
                const topicUrl = `/topics/${actors.topic.slug}`;
                const methodUrl = `${topicUrl}/methods/${actors.method.id}`;
                const editUrl = `${methodUrl}/edit`;
                const updateUrl = `${methodUrl}/updates`;
                const returnPattern = new RegExp(
                    `${topicUrl}#method-${actors.method.id}$`,
                );

                await login(contributor, actors.contributor);
                await contributor.goto(`${methodUrl}/experiences/create`);
                await contributor
                    .getByLabel('What was your result?')
                    .selectOption('worked');
                await contributor
                    .getByRole('textbox', { name: 'How did it go?' })
                    .fill('I tried this method before the author added a note.');
                await contributor
                    .getByRole('button', {
                        name: 'Publish my response',
                        exact: true,
                    })
                    .click();
                await expect(contributor).toHaveURL(
                    new RegExp(`${methodUrl}/experiences$`),
                );

                await login(page, actors.owner);
                await page.goto(editUrl);
                await expect(
                    page.getByRole('heading', {
                        name: 'Add an update',
                        exact: true,
                    }),
                ).toBeVisible();

                const body = page.getByLabel('Your update', { exact: true });
                const submission = page.locator('input[name="submission_id"]');
                const initialSubmissionId = await submission.inputValue();
                const publish = page.getByRole('button', {
                    name: 'Publish update',
                    exact: true,
                });
                const original = 'The first note was saved before the connection failed.';
                const revised = 'This revised draft must remain available until I publish it.';
                let updateRequests = 0;
                let responseLost = false;
                page.on('request', (request) => {
                    if (
                        request.method() === 'POST' &&
                        new URL(request.url()).pathname === updateUrl
                    ) {
                        updateRequests++;
                    }
                });

                // Send the real POST to the isolated application, then discard
                // only its response. The server has committed the original note.
                await page.route(`**${updateUrl}`, async (route) => {
                    if (route.request().method() !== 'POST' || responseLost) {
                        await route.continue();
                        return;
                    }

                    responseLost = true;
                    const response = await route.fetch({ maxRedirects: 0 });
                    expect([302, 303]).toContain(response.status());
                    await route.abort('failed');
                });

                await body.fill(original);
                const lostRequest = page.waitForEvent(
                    'requestfailed',
                    (request) =>
                        request.method() === 'POST' &&
                        new URL(request.url()).pathname === updateUrl,
                );
                await publish.click();
                await lostRequest;
                await expect(publish).toBeEnabled();
                await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
                await expect(body).toHaveValue(original);
                await expect(submission).toHaveValue(initialSubmissionId);

                if (!changedDraft) {
                    await publish.click();
                    await expect(page).toHaveURL(returnPattern);
                    await expect(
                        page.getByText('This update was already published.', {
                            exact: true,
                        }),
                    ).toBeVisible();
                    const updates = page.getByRole('region', {
                        name: 'Author updates',
                    });
                    await expect(
                        updates.getByText(original, { exact: true }),
                    ).toHaveCount(1);
                    expect(updateRequests).toBe(2);
                    return;
                }

                await body.fill(revised);
                await publish.click();
                const conflict = page.getByRole('alert').filter({
                    hasText: 'Your current text has not been published.',
                });
                await expect(conflict).toBeVisible();
                await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
                await expect(body).toHaveValue(revised);
                await expect(body).toBeFocused();
                await expect(submission).toHaveValue(initialSubmissionId);
                await expect(publish).toBeDisabled();
                await expect(
                    page.getByText('Update added.', { exact: true }),
                ).toHaveCount(0);

                // Checking what was published must not navigate away from the
                // current draft. This link opens a separate, read-only tab.
                const popupPromise = page.waitForEvent('popup');
                await page
                    .getByRole('link', {
                        name: 'View published updates (new tab)',
                        exact: true,
                    })
                    .click();
                const published = await popupPromise;
                const publishedUpdates = published.getByRole('region', {
                    name: 'Author updates',
                });
                await expect(
                    publishedUpdates.getByText(original, { exact: true }),
                ).toHaveCount(1);
                await expect(
                    publishedUpdates.getByText(revised, { exact: true }),
                ).toHaveCount(0);
                await published.close();
                await expect(body).toHaveValue(revised);
                await testInfo.attach('update-retry-conflict', {
                    body: await page.screenshot({ fullPage: true }),
                    contentType: 'image/png',
                });

                await page
                    .getByRole('button', {
                        name: 'Use this draft for a new update',
                        exact: true,
                    })
                    .click();
                await expect(submission).not.toHaveValue(initialSubmissionId);
                await expect(conflict).toHaveCount(0);
                await expect(body).toHaveValue(revised);
                await expect(body).toBeFocused();
                await expect(publish).toBeEnabled();
                expect(updateRequests).toBe(2);

                await publish.click();
                await expect(page).toHaveURL(returnPattern);
                await page.reload();
                const updates = page.getByRole('region', {
                    name: 'Author updates',
                });
                await expect(
                    updates.getByText(original, { exact: true }),
                ).toHaveCount(1);
                await expect(
                    updates.getByText(revised, { exact: true }),
                ).toHaveCount(1);
                expect(updateRequests).toBe(3);
                await testInfo.attach('recovered-method-update', {
                    body: await page.screenshot({ fullPage: true }),
                    contentType: 'image/png',
                });
            } finally {
                await contributorContext.close();
            }
        },
    );
}
