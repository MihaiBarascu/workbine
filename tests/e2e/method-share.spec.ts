import { expect, test } from './fixtures';

for (const clipboardAvailable of [true, false]) {
    test(`a method link can be shared with clipboard ${clipboardAvailable ? 'available' : 'unavailable'}`, async ({
        page,
        actors,
    }, testInfo) => {
        await page.addInitScript((available) => {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (value: string) => {
                        if (!available)
                            throw new Error('Clipboard unavailable');
                        document.documentElement.dataset.copiedMethodLink =
                            value;
                    },
                },
            });
        }, clipboardAvailable);
        await page.goto(`/topics/${actors.topic.slug}`);
        const method = page.locator(`#method-${actors.method.id}`);
        await method
            .getByRole('button', { name: 'Copy link', exact: true })
            .click();
        const expected = `http://127.0.0.1:8000/topics/${actors.topic.slug}#method-${actors.method.id}`;
        if (clipboardAvailable) {
            await expect(method.getByRole('status')).toHaveText('Link copied');
            await expect(page.locator('html')).toHaveAttribute(
                'data-copied-method-link',
                expected,
            );
        } else {
            await expect(method.getByRole('status')).toHaveText(
                'Select and copy the link below.',
            );
            await expect(method.getByLabel('Link to copy')).toHaveValue(
                expected,
            );
        }
        await expect(page).toHaveURL(
            `http://127.0.0.1:8000/topics/${actors.topic.slug}`,
        );
        await testInfo.attach('method-copy-feedback', {
            body: await page.screenshot(),
            contentType: 'image/png',
        });
        await page.goto(expected);
        await expect(page).toHaveURL(expected);
        await expect(
            method.getByRole('heading', {
                name: actors.method.title,
                exact: true,
            }),
        ).toBeInViewport();
    });
}
