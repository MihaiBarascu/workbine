import { expect, login, test } from './fixtures';
import { imageFile } from './fixtures';
import type { Page } from '@playwright/test';

test('three members complete one topic, methods, feedback and reputation journey', async ({
    browser,
    actors,
}, testInfo) => {
    test.setTimeout(120_000);

    // The fixture supplies the verified reviewer account alongside the two
    // established actors. Keeping this check here makes a missing seed fail
    // with a useful message instead of producing misleading reputation data.
    if (!actors?.reviewer) throw new Error('Reviewer actor is required');

    const ownerContext = await browser.newContext();
    const contributorContext = await browser.newContext();
    const reviewerContext = await browser.newContext();
    try {
        const owner = await ownerContext.newPage();
        const contributor = await contributorContext.newPage();
        const reviewer = await reviewerContext.newPage();
        await login(owner, actors.owner);
        await login(contributor, actors.contributor);
        await login(reviewer, actors.reviewer);

        const title = `A practical three-member workflow ${Date.now()}`;
        await owner.goto('/topics/create');
        await owner.getByLabel('Topic').fill(title);
        await owner
            .getByLabel('A little context')
            .fill(
                'A complete synthetic community journey with real steps and feedback.',
            );
        await owner
            .getByRole('checkbox', { name: 'Add my method too' })
            .check();
        await owner.getByLabel('Method title').fill('Owner baseline method');
        await owner
            .getByRole('textbox', { name: 'How you do it' })
            .fill(
                'Start with a small repeatable step, record the result, and adjust once.',
            );
        await owner
            .getByLabel('Upload photo', { exact: true })
            .setInputFiles(imageFile);
        await expect(owner.locator('[contenteditable="true"] img')).toHaveCount(
            1,
        );
        await owner.locator('[contenteditable="true"] img').click();
        await owner
            .getByLabel('Describe this photo for people who cannot see it')
            .fill('A small owner method example photo.');
        await owner
            .getByRole('button', {
                name: 'Publish topic & method',
                exact: true,
            })
            .click();
        await expect(owner).toHaveURL(/\/topics\/[^/]+$/);
        await expect(
            owner.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible();
        const topicUrl = new URL(owner.url()).pathname;
        const ownerMethod = owner.getByRole('article').filter({
            has: owner.getByRole('heading', {
                name: 'Owner baseline method',
                exact: true,
            }),
        });
        await expect(ownerMethod).toBeVisible();
        await expect(
            owner.getByRole('img', {
                name: 'A small owner method example photo.',
                exact: true,
            }),
        ).toBeVisible();
        await expect
            .poll(() =>
                owner
                    .getByRole('img', {
                        name: 'A small owner method example photo.',
                        exact: true,
                    })
                    .evaluate(
                        (image: HTMLImageElement) =>
                            image.complete && image.naturalWidth > 0,
                    ),
            )
            .toBe(true);
        await owner.reload();
        await expect(
            owner.getByRole('img', {
                name: 'A small owner method example photo.',
                exact: true,
            }),
        ).toBeVisible();
        await expect
            .poll(() =>
                owner
                    .getByRole('img', {
                        name: 'A small owner method example photo.',
                        exact: true,
                    })
                    .evaluate(
                        (image: HTMLImageElement) =>
                            image.complete && image.naturalWidth > 0,
                    ),
            )
            .toBe(true);
        const ownerMethodHref = await ownerMethod
            .getByRole('link', { name: /experiences$/ })
            .getAttribute('href');
        const ownerMethodId = ownerMethodHref!.match(
            /methods\/(\d+)\/experiences/,
        )![1];

        async function publishMethod(page: Page, methodTitle: string) {
            await page.goto(`${topicUrl}/methods/create`);
            await expect(page).toHaveURL(/\/methods\/create$/);
            await expect(
                page.getByRole('heading', {
                    name: 'How did you actually do it?',
                    exact: true,
                }),
            ).toBeVisible();
            await page.locator('input#title').fill(methodTitle);
            await page
                .getByRole('textbox', { name: 'How you do it' })
                .fill(
                    `${methodTitle} explains the steps and the context where they worked.`,
                );
            await page
                .getByRole('button', { name: 'Share method', exact: true })
                .click();
            await expect(page).toHaveURL(new RegExp(`${topicUrl}$`));
            const article = page.getByRole('article').filter({
                has: page.getByRole('heading', {
                    name: methodTitle,
                    exact: true,
                }),
            });
            await expect(article).toBeVisible();
            const href = await article
                .getByRole('link', { name: /experiences$/ })
                .getAttribute('href');
            return {
                article,
                id: href!.match(/methods\/(\d+)\/experiences/)![1],
            };
        }

        const contributorMethod = await publishMethod(
            contributor,
            'Contributor alternative method',
        );
        await publishMethod(reviewer, 'Reviewer alternative method');

        await owner.goto(topicUrl);
        await expect(
            owner.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible();
        await expect(
            owner.getByText('3 methods shared', { exact: true }),
        ).toBeVisible();
        for (const methodTitle of [
            'Owner baseline method',
            'Contributor alternative method',
            'Reviewer alternative method',
        ]) {
            const methodArticle = owner.getByRole('article').filter({
                has: owner.getByRole('heading', {
                    name: methodTitle,
                    exact: true,
                }),
            });
            await expect(methodArticle).toBeVisible();
            const author = methodTitle.startsWith('Owner')
                ? actors.owner.name
                : methodTitle.startsWith('Contributor')
                  ? actors.contributor.name
                  : actors.reviewer.name;
            await expect(
                methodArticle.getByText(author, { exact: true }),
            ).toBeVisible();
        }

        async function saveAndAppreciate(page: Page) {
            await page.goto(topicUrl);
            await page
                .getByRole('button', { name: 'Appreciate topic', exact: true })
                .click();
            await expect(
                page.getByRole('button', {
                    name: 'Remove appreciation',
                    exact: true,
                }),
            ).toBeVisible();
            await page
                .getByRole('button', { name: 'Save topic', exact: true })
                .click();
            await expect(
                page.getByRole('button', {
                    name: 'Remove saved topic',
                    exact: true,
                }),
            ).toBeVisible();
            await page.reload();
            await expect(
                page.getByRole('button', {
                    name: 'Remove appreciation',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', {
                    name: 'Remove saved topic',
                    exact: true,
                }),
            ).toBeVisible();
        }
        await saveAndAppreciate(contributor);
        await saveAndAppreciate(reviewer);
        await assertProfile(owner, actors.owner, 2, 2, 0, 0, 0);

        async function publishExperience(
            page: Page,
            methodId: string,
            outcome: 'worked' | 'partly' | 'did_not_work',
            body: string,
        ) {
            await page.goto(
                `${topicUrl}/methods/${methodId}/experiences/create`,
            );
            await page
                .getByLabel('What was your result?')
                .selectOption(outcome);
            await page
                .getByRole('textbox', { name: 'How did it go?' })
                .fill(body);
            await page
                .getByRole('button', {
                    name: 'Publish my response',
                    exact: true,
                })
                .click();
            await expect(page).toHaveURL(
                new RegExp(`${topicUrl}/methods/${methodId}/experiences$`),
            );
            await expect(
                page.getByRole('article').filter({ hasText: body }),
            ).toBeVisible();
        }
        await publishExperience(
            contributor,
            ownerMethodId,
            'worked',
            'The baseline worked for my setup and made the first run repeatable.',
        );
        await publishExperience(
            reviewer,
            ownerMethodId,
            'partly',
            'The baseline partly worked after I adapted the final step to my context.',
        );
        await publishExperience(
            owner,
            contributorMethod.id,
            'worked',
            'The alternative method worked for me and was easy to repeat.',
        );

        async function assertProfile(
            page: Page,
            actor: { username: string },
            score: number,
            saves: number,
            worked: number,
            partly: number,
            methodsTried: number,
        ) {
            await page.goto(`/members/${actor.username}`);
            const details = page.getByText('Reputation details', {
                exact: true,
            });
            await details.click();
            await expect(
                page.getByText(new RegExp(`^${score} points from`)),
            ).toBeVisible();
            const aside = page.getByRole('complementary');
            await expect(
                page.getByRole('link', {
                    name: `Methods tried: ${methodsTried}`,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('link', {
                    name: `Worked for others: ${worked}`,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('link', { name: `Partly worked: ${partly}` }),
            ).toBeVisible();
            await expect(
                page.getByRole('link', { name: `Topic saves: ${saves}` }),
            ).toBeVisible();
            await expect(
                aside
                    .getByText(`Counted saves`)
                    .locator('..')
                    .getByText(`+${saves}`, { exact: true }),
            ).toBeVisible();
            await expect(
                aside
                    .getByText(`Worked (${worked})`, { exact: true })
                    .locator('..')
                    .getByText(`+${worked * 5}`, { exact: true }),
            ).toBeVisible();
            await expect(
                aside
                    .getByText(`Partly worked (${partly})`, { exact: true })
                    .locator('..')
                    .getByText(`+${partly * 2}`, { exact: true }),
            ).toBeVisible();
        }
        await assertProfile(owner, actors.owner, 9, 2, 1, 1, 1);
        await assertProfile(contributor, actors.contributor, 5, 0, 1, 0, 1);

        await contributor.goto(
            `${topicUrl}/methods/${ownerMethodId}/experiences`,
        );
        await contributor
            .getByRole('link', { name: 'Edit my experience', exact: true })
            .click();
        await contributor
            .getByLabel('What was your result?')
            .selectOption('did_not_work');
        await contributor
            .getByRole('button', { name: 'Update my response', exact: true })
            .click();
        await expect(
            contributor.getByRole('link', {
                name: /Did not work for me: 1 experience/,
            }),
        ).toBeVisible();
        await assertProfile(owner, actors.owner, 4, 2, 0, 1, 1);
        await reviewer.goto(topicUrl);
        await reviewer
            .getByRole('button', { name: 'Remove saved topic', exact: true })
            .click();
        await expect(
            reviewer.getByRole('button', { name: 'Save topic', exact: true }),
        ).toBeVisible();
        await assertProfile(owner, actors.owner, 3, 1, 0, 1, 1);
        await owner.goto(topicUrl);
        await expect(
            owner.getByText('3 methods shared', { exact: true }),
        ).toBeVisible();
        await expect(
            owner.getByRole('heading', {
                name: 'Owner baseline method',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            owner.getByRole('heading', {
                name: 'Contributor alternative method',
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            owner.getByRole('heading', {
                name: 'Reviewer alternative method',
                exact: true,
            }),
        ).toBeVisible();

        await testInfo.attach('community-journey-final', {
            body: await owner.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });
    } finally {
        await ownerContext.close();
        await contributorContext.close();
        await reviewerContext.close();
    }
});
