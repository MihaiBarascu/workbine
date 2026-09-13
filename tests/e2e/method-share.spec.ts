import { expect, test } from './fixtures';

for (const clipboardAvailable of [true, false]) {
    test(`a method link can be shared with clipboard ${clipboardAvailable ? 'available' : 'unavailable'}`, async ({
        page,
        actors,
    }, testInfo) => {
        await page.addInitScript((available) => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined,
            });
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
        const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
        await page.goto(methodUrl);
        const method = page.locator('main article').first();
        await expect(
            method.getByRole('button', { name: 'Share link', exact: true }),
        ).toHaveText('');
        await method
            .getByRole('button', { name: 'Share link', exact: true })
            .click();
        const expected = `http://127.0.0.1:8000${methodUrl}`;
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
        await expect(page).toHaveURL(`http://127.0.0.1:8000${methodUrl}`);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(page.viewportSize()!.width);
        await testInfo.attach('method-copy-feedback', {
            body: await page.screenshot(),
            contentType: 'image/png',
        });
        await page.goto(expected);
        await expect(page).toHaveURL(expected);
        await expect(
            page.getByRole('heading', {
                name: actors.method.title,
                exact: true,
            }),
        ).toBeInViewport();
    });
}

for (const outcome of ['shared', 'cancelled', 'unavailable'] as const) {
    test(`native method sharing: ${outcome}`, async ({ page, actors }) => {
        await page.addInitScript((result) => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: async ({ url }: { url: string }) => {
                    document.documentElement.dataset.sharedLink = url;
                    if (result === 'cancelled')
                        throw new DOMException('Cancelled', 'AbortError');
                    if (result === 'unavailable')
                        throw new DOMException(
                            'Unavailable',
                            'NotAllowedError',
                        );
                },
            });
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (url: string) => {
                        document.documentElement.dataset.copiedLink = url;
                    },
                },
            });
        }, outcome);
        const methodUrl = `/topics/${actors.topic.slug}/methods/${actors.method.id}`;
        await page.goto(methodUrl);
        const method = page.locator('main article').first();
        const button = method.getByRole('button', {
            name: 'Share link',
            exact: true,
        });
        await button.click();
        const expected = `http://127.0.0.1:8000${methodUrl}`;
        await expect(page.locator('html')).toHaveAttribute(
            'data-shared-link',
            expected,
        );
        await expect(button).toBeEnabled();
        if (outcome === 'unavailable') {
            await expect(page.locator('html')).toHaveAttribute(
                'data-copied-link',
                expected,
            );
            await expect(method.getByRole('status')).toHaveText('Link copied');
        } else {
            await expect(page.locator('html')).not.toHaveAttribute(
                'data-copied-link',
            );
            await expect(method.getByRole('status')).toHaveText('');
        }
        await page.goto(`/topics/${actors.topic.slug}`);
        await page
            .locator('.wb-topic-tools')
            .getByRole('button', { name: 'Share link', exact: true })
            .click();
        await expect(page.locator('html')).toHaveAttribute(
            'data-shared-link',
            `http://127.0.0.1:8000/topics/${actors.topic.slug}`,
        );
    });
}
