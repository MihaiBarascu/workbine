import { expect, login, test } from './fixtures';

for (const retry of ['identical', 'changed'] as const) {
    test(`${retry} method update retry after a lost response preserves published work`, async ({
        page,
        context,
        actors,
    }, testInfo) => {
        const topicUrl = `/topics/${actors.topic.slug}`;
        const methodUrl = `${topicUrl}/methods/${actors.method.id}`;
        const editorUrl = `${methodUrl}/edit`;
        const original = 'A published clarification whose response was lost.';
        const draft = 'An edited clarification which needs its own dated update.';

        await login(page, actors.contributor);
        await page.goto(`${methodUrl}/experiences/create`);
        await page.getByLabel('What was your result?').selectOption('worked');
        await page
            .getByRole('textbox', { name: 'How did it go?' })
            .fill('I tried the method and can describe the result.');
        await page
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(page).toHaveURL(new RegExp(`${methodUrl}/experiences$`));

        await login(page, actors.owner);
        await page.goto(editorUrl);
        const body = page.getByLabel('Your update', { exact: true });
        const publish = page.getByRole('button', {
            name: 'Publish update',
            exact: true,
        });
        const key = page.locator('input[name="submission_id"]');
        const originalKey = await key.inputValue();
        await body.fill(original);

        // Let the real server commit, then lose only the response to the browser.
        // No production origin is permitted by the shared fixture.
        await page.route(
            `**${methodUrl}/updates`,
            async (route) => {
                const response = await route.fetch({ maxRedirects: 0 });
                expect([302, 303]).toContain(response.status());
                await route.abort('failed');
            },
            { times: 1 },
        );
        await publish.click();
        await expect(publish).toBeEnabled();
        await expect(page).toHaveURL(new RegExp(`${editorUrl}$`));
        await expect(body).toHaveValue(original);
        await expect(key).toHaveValue(originalKey);

        const published = await context.newPage();
        try {
            await published.goto(topicUrl);
            const notes = published.getByRole('region', {
                name: 'Author updates',
            });
            await expect(notes.getByText(original, { exact: true })).toHaveCount(1);

            if (retry === 'identical') {
                await publish.click();
                await expect(page).toHaveURL(
                    new RegExp(`${topicUrl}#method-${actors.method.id}$`),
                );
                await expect(
                    page.getByText('This update was already published.', {
                        exact: true,
                    }),
                ).toBeVisible();
                await published.reload();
                await expect(notes.getByText(original, { exact: true })).toHaveCount(1);
                await expect(notes.locator('time')).toHaveCount(1);
                return;
            }

            await body.fill(draft);
            await publish.click();
            const conflict = page.getByRole('alert').filter({
                hasText: 'An earlier version of this update was already published.',
            });
            await expect(page).toHaveURL(new RegExp(`${editorUrl}$`));
            await expect(conflict).toContainText(
                'Your current text has not been published.',
            );
            await expect(conflict).toBeFocused();
            await expect(body).toHaveValue(draft);
            await expect(key).toHaveValue(originalKey);
            await expect(page.getByText('Update added.', { exact: true })).toHaveCount(0);
            await testInfo.attach('retry-conflict-draft-preserved', {
                body: await page.screenshot({ fullPage: true }),
                contentType: 'image/png',
            });

            const popupPromise = page.waitForEvent('popup');
            await page
                .getByRole('link', {
                    name: 'Review published updates (new tab)',
                    exact: true,
                })
                .click();
            const review = await popupPromise;
            await expect(
                review.getByRole('region', { name: 'Author updates' })
                    .getByText(original, { exact: true }),
            ).toHaveCount(1);
            await review.close();
            await expect(body).toHaveValue(draft);

            await page
                .getByRole('button', {
                    name: 'Use this draft for a new update',
                    exact: true,
                })
                .click();
            await expect(conflict).toHaveCount(0);
            await expect(body).toHaveValue(draft);
            await expect(body).toBeFocused();
            await expect(key).not.toHaveValue(originalKey);

            // Preparing a new key must not publish until the author submits.
            await published.reload();
            await expect(notes.getByText(original, { exact: true })).toHaveCount(1);
            await expect(notes.getByText(draft, { exact: true })).toHaveCount(0);
            await expect(notes.locator('time')).toHaveCount(1);

            await publish.click();
            await expect(page).toHaveURL(
                new RegExp(`${topicUrl}#method-${actors.method.id}$`),
            );
            await published.reload();
            await expect(notes.getByText(original, { exact: true })).toHaveCount(1);
            await expect(notes.getByText(draft, { exact: true })).toHaveCount(1);
            await expect(notes.locator('time')).toHaveCount(2);
            await testInfo.attach('retry-recovery-separate-published-updates', {
                body: await published.screenshot({ fullPage: true }),
                contentType: 'image/png',
            });
        } finally {
            await published.close();
        }
    });
}
