import { expect, login, test } from './fixtures';
import { imageFile } from './fixtures';

test('an experienced method stays intact while its author can add dated updates', async ({
    browser,
    actors,
}, testInfo) => {
    test.setTimeout(90_000);

    const ownerContext = await browser.newContext();
    const contributorContext = await browser.newContext();
    const reviewerContext = await browser.newContext();
    try {
        const owner = await ownerContext.newPage();
        const staleEditor = await ownerContext.newPage();
        const contributor = await contributorContext.newPage();
        const reviewer = await reviewerContext.newPage();
        const topicUrl = `/topics/${actors.topic.slug}`;
        const methodEditUrl = `${topicUrl}/methods/${actors.method.id}/edit`;
        const methodUrl = `${topicUrl}/methods/${actors.method.id}`;
        const experienceUrl = `${methodUrl}/experiences`;

        await login(owner, actors.owner);
        await login(contributor, actors.contributor);
        await login(reviewer, actors.reviewer);

        // Establish a known original with all three preserved details through
        // the normal method editor before opening stale copies.
        await owner.goto(methodEditUrl);
        await owner.getByLabel('Method title').fill('Preserved browser method');
        const originalBody =
            'I use a small measured step, record the result, and keep the working version.';
        await owner
            .getByRole('textbox', { name: 'How you do it' })
            .fill(originalBody);
        await owner
            .getByLabel('Upload photo', { exact: true })
            .setInputFiles(imageFile);
        await expect(owner.locator('[contenteditable="true"] img')).toHaveCount(
            1,
        );
        await owner.locator('[contenteditable="true"] img').click();
        await owner
            .getByLabel('Describe this photo for people who cannot see it')
            .fill('The preserved method reference photo.');
        const sourceDetails = owner
            .locator('details')
            .filter({ hasText: 'Add a source' });
        await sourceDetails.locator('summary').click();
        await expect(sourceDetails).toHaveAttribute('open', '');
        const originalSource = 'https://example.test/preserved-method';
        await owner
            .getByLabel('Source link', { exact: false })
            .fill(originalSource);
        await owner
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await expect(owner).toHaveURL(new RegExp(`${topicUrl}(?:#.*)?$`));
        await expect(
            owner.getByRole('heading', {
                name: 'Preserved browser method',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            owner.getByRole('img', {
                name: 'The preserved method reference photo.',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            owner.getByText(originalSource, { exact: true }),
        ).toBeVisible();
        await expect
            .poll(() =>
                owner
                    .getByRole('img', {
                        name: 'The preserved method reference photo.',
                        exact: true,
                    })
                    .evaluate(
                        (image: HTMLImageElement) =>
                            image.complete && image.naturalWidth > 0,
                    ),
            )
            .toBe(true);

        // Both editor tabs receive the same revision. The second one remains
        // stale after the contributor's first response freezes the method.
        await owner.goto(methodEditUrl);
        await staleEditor.goto(methodEditUrl);
        await expect(
            staleEditor.getByRole('heading', {
                name: 'Edit your method',
                exact: true,
            }),
        ).toBeVisible();
        await contributor.goto(`${methodUrl}/experiences/create`);
        await expect(
            contributor.getByLabel('What was your result?'),
        ).toBeVisible();
        await contributor
            .getByLabel('What was your result?')
            .selectOption('worked');
        const experienceBody =
            'I tried the preserved method and it worked in my own setup.';
        await contributor
            .getByRole('textbox', { name: 'How did it go?' })
            .fill(experienceBody);
        await contributor
            .getByRole('button', { name: 'Publish my response', exact: true })
            .click();
        await expect(contributor).toHaveURL(new RegExp(`${experienceUrl}$`));
        await expect(
            contributor
                .getByRole('article')
                .filter({ hasText: experienceBody }),
        ).toBeVisible();

        await staleEditor
            .getByLabel('Method title')
            .fill('A stale rewrite that must be rejected');
        await staleEditor
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await expect(staleEditor.getByRole('alert')).toContainText(
            /changed after you opened|someone has tried/i,
        );
        await staleEditor.reload();
        await expect(
            staleEditor.getByRole('heading', {
                name: 'Add an update',
                exact: true,
            }),
        ).toBeVisible();
        await expect(staleEditor.getByLabel('Method title')).toHaveCount(0);
        await expect(
            staleEditor.getByRole('textbox', { name: 'How you do it' }),
        ).toHaveCount(0);
        await expect(
            staleEditor.getByText(
                /original explanation, photos and sources are preserved/i,
            ),
        ).toBeVisible();
        const originalDetails = staleEditor
            .locator('details')
            .filter({ hasText: 'Original method: Preserved browser method' });
        await originalDetails.locator('summary').click();
        await expect(originalDetails).toHaveAttribute('open', '');
        await expect(
            staleEditor.getByText(originalBody, { exact: true }),
        ).toBeVisible();
        await expect(
            staleEditor.getByText(originalSource, { exact: false }),
        ).toBeVisible();
        await expect(
            staleEditor.getByRole('img', {
                name: 'The preserved method reference photo.',
                exact: true,
            }),
        ).toBeVisible();
        await expect
            .poll(() =>
                staleEditor
                    .getByRole('img', {
                        name: 'The preserved method reference photo.',
                        exact: true,
                    })
                    .evaluate(
                        (image: HTMLImageElement) =>
                            image.complete && image.naturalWidth > 0,
                    ),
            )
            .toBe(true);
        await testInfo.attach('protected-method-editor', {
            body: await staleEditor.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });

        const updateBody =
            'A dated update: I now measure the first pass before changing the final step.';
        await staleEditor
            .getByLabel('Your update', { exact: true })
            .fill(updateBody);
        await staleEditor
            .getByRole('button', { name: 'Publish update', exact: true })
            .click();
        await expect(staleEditor).toHaveURL(
            new RegExp(`${topicUrl}#method-${actors.method.id}$`),
        );
        const updateSection = staleEditor.getByRole('region', {
            name: 'Author updates',
        });
        await expect(updateSection).toBeVisible();
        await expect(
            updateSection.getByText(updateBody, { exact: true }),
        ).toBeVisible();
        await expect(updateSection).toContainText(
            'Earlier experiences do not evaluate these updates.',
        );
        await expect(
            staleEditor.getByRole('heading', {
                name: 'Preserved browser method',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            staleEditor.getByText(originalBody, { exact: true }),
        ).toBeVisible();
        await expect(
            staleEditor.getByText(originalSource, { exact: true }),
        ).toBeVisible();
        await expect(
            staleEditor.getByRole('img', {
                name: 'The preserved method reference photo.',
                exact: true,
            }),
        ).toBeVisible();
        await testInfo.attach('published-method-update', {
            body: await staleEditor.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });

        // A non-owner can see the protected state but cannot open the author
        // editor. This is a read-only forbidden check and creates no data.
        const forbidden = await reviewer.goto(methodEditUrl);
        expect(forbidden?.status()).toBe(403);

        // Removing the only experience is a UI mutation, but preservation is
        // permanent and the author still sees the append-only editor.
        await contributor.goto(experienceUrl);
        contributor.once('dialog', (dialog) => dialog.accept());
        await contributor
            .getByRole('button', { name: 'Remove my response', exact: true })
            .click();
        await expect(
            contributor.getByRole('heading', {
                name: '0 experiences',
                exact: true,
            }),
        ).toBeVisible();

        await owner.goto(topicUrl);
        const methodArticle = owner.getByRole('article').filter({
            has: owner.getByRole('heading', {
                name: 'Preserved browser method',
                exact: true,
            }),
        });
        await expect(
            methodArticle.getByRole('link', {
                name: 'Add an update',
                exact: true,
            }),
        ).toBeVisible();
        await owner.goto(methodEditUrl);
        await expect(
            owner.getByRole('heading', { name: 'Add an update', exact: true }),
        ).toBeVisible();
        await expect(
            owner.getByLabel('Your update', { exact: true }),
        ).toBeVisible();
        await expect(
            owner.getByRole('heading', {
                name: 'Edit your method',
                exact: true,
            }),
        ).toHaveCount(0);

        await owner.goto(`/members/${actors.owner.username}`);
        await owner.getByText('Reputation details', { exact: true }).click();
        await expect(owner.getByText(/^0 points from/)).toBeVisible();
        await expect(
            owner.getByRole('link', {
                name: 'Worked for others: 0',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            owner.getByRole('link', { name: 'Partly worked: 0', exact: true }),
        ).toBeVisible();
    } finally {
        await ownerContext.close();
        await contributorContext.close();
        await reviewerContext.close();
    }
});
