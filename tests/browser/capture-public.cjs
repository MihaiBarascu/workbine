// Only the disposable preview server; no production writes.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdir } = require('node:fs/promises');
const { chromium } = createRequire('/tmp/workbine-browser/package.json')(
    'playwright',
);

(async () => {
    const browser = await chromium.launch();
    const root = 'http://127.0.0.1:8000';
    const output = '/tmp/workbine-ui-preview';
    await mkdir(output, { recursive: true });

    async function assertReachable(link, name, width) {
        assert.equal(await link.isVisible(), true, `${name} must be visible`);
        const bounds = await link.boundingBox();
        assert.ok(
            bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
            `${name} must fit within the viewport`,
        );
        await link.click({ trial: true });
        assert.ok(
            await link.evaluate((element) => element.tabIndex >= 0),
            `${name} must remain in the keyboard tab order`,
        );
        await link.focus();
        assert.equal(
            await link.evaluate(
                (element) => document.activeElement === element,
            ),
            true,
            `${name} must support keyboard focus`,
        );
        await link.evaluate((element) => element.blur());
    }

    async function inspectLayout(page, name, width, colorScheme, feed) {
        assert.equal(
            await page.evaluate(
                () =>
                    document.documentElement.scrollWidth <=
                    window.innerWidth + 1,
            ),
            true,
            `${name}: page must not overflow horizontally`,
        );
        assert.equal(
            await page.locator('main h1').count(),
            1,
            `${name}: one h1`,
        );
        assert.equal(
            await page.evaluate(() =>
                document.documentElement.classList.contains('dark'),
            ),
            colorScheme === 'dark',
            `${name}: system color preference must be respected`,
        );

        const navigation = page.getByRole('navigation', {
            name: 'Main navigation',
            exact: true,
        });
        assert.equal(await navigation.isVisible(), true);
        await assertReachable(
            page.getByRole('link', { name: 'Workbine home', exact: true }),
            `${name}: home link`,
            width,
        );
        for (const label of ['Log in', 'Join Workbine']) {
            await assertReachable(
                navigation.getByRole('link', { name: label, exact: true }),
                `${name}: ${label}`,
                width,
            );
        }
        if (width >= 768) {
            await assertReachable(
                page.getByRole('link', { name: 'Explore', exact: true }),
                `${name}: Explore`,
                width,
            );
        }

        if (feed) {
            if (width >= 1440) {
                const bounds = await page.locator('#topics').boundingBox();
                assert.ok(
                    bounds && bounds.width >= 900,
                    `${name}: desktop feed must use at least 900px of available width (actual ${bounds?.width}px)`,
                );
            }
            for (const row of await page.locator('main article').all()) {
                const title = row.getByRole('heading').getByRole('link');
                assert.equal(
                    await title.count(),
                    1,
                    `${name}: linked topic title`,
                );
                assert.match(
                    await title.getAttribute('href'),
                    /^\/topics\/[^/?#]+$/,
                    `${name}: topic title must open its own topic`,
                );
                for (const link of await row.getByRole('link').all()) {
                    await assertReachable(
                        link,
                        `${name}: topic row link ${await link.innerText()}`,
                        width,
                    );
                }
            }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
    }

    const feedCases = [
        [320, 'small'],
        [375, 'mobile'],
        [768, 'tablet'],
        [1024, 'laptop'],
        [1440, 'desktop'],
        [1920, 'wide'],
    ].flatMap(([width, size]) =>
        ['light', 'dark'].map((colorScheme) => [
            '/topics',
            `topics-${size}${colorScheme === 'dark' ? '-dark' : ''}`,
            width,
            colorScheme,
            'main article',
        ]),
    );
    const searchCases = [320, 1440].flatMap((width) =>
        ['light', 'dark'].flatMap((colorScheme) =>
            [
                ['customer', 'search', 'main article'],
                ['no-matching-preview-topic', 'no-results', '.wb-empty'],
            ].map(([query, state, selector]) => [
                `/topics?q=${query}`,
                `topics-${state}-${width}${colorScheme === 'dark' ? '-dark' : ''}`,
                width,
                colorScheme,
                selector,
            ]),
        ),
    );
    try {
        for (const [path, name, width, colorScheme, selector] of [
            ...feedCases,
            ...searchCases,
            [
                '/topics/preview-first-customer',
                'method-desktop',
                1440,
                'light',
                'main article',
            ],
            [
                '/topics/preview-first-customer',
                'method-mobile',
                375,
                'light',
                'main article',
            ],
            [
                '/topics/preview-first-customer',
                'method-mobile-dark',
                375,
                'dark',
                'main article',
            ],
            [
                '/topics/preview-unanswered',
                'topic-without-methods-mobile',
                375,
                'light',
                '#methods-heading',
            ],
            [
                '/topics?view=unanswered',
                'unanswered-feed-mobile',
                375,
                'light',
                'main article',
            ],
        ]) {
            const page = await browser.newPage({
                viewport: { width, height: width >= 1024 ? 1080 : 812 },
                colorScheme,
            });
            page.setDefaultTimeout(15000);
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const response = await page.goto(root + path);
            if (!response?.ok()) {
                throw new Error(`${path} returned HTTP ${response?.status()}`);
            }
            await page.locator(selector).first().waitFor();
            await page.evaluate(() => document.fonts.ready);
            const feed = new URL(root + path).pathname === '/topics';
            await inspectLayout(page, name, width, colorScheme, feed);
            if (feed) {
                const query = new URL(root + path).searchParams.get('q');
                if (query) {
                    assert.equal(
                        await page
                            .getByRole('searchbox', { name: 'Search topics' })
                            .inputValue(),
                        query,
                        `${name}: search must retain the query`,
                    );
                    await assertReachable(
                        page.getByRole('link', { name: 'Clear search' }),
                        `${name}: clear search`,
                        width,
                    );
                    if (query === 'customer') {
                        assert.equal(
                            await page.locator('main article').count(),
                            1,
                        );
                        await page
                            .getByRole('heading', {
                                name: 'How do you find the first customer for a small SaaS?',
                                exact: true,
                            })
                            .waitFor();
                    } else {
                        assert.equal(
                            await page.locator('main article').count(),
                            0,
                        );
                        await page
                            .getByRole('heading', {
                                name: 'No matching topics yet',
                                exact: true,
                            })
                            .waitFor();
                    }
                }
            }
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.mouse.move(0, 0);
            await page.screenshot({
                path: `${output}/${name}.png`,
                fullPage: true,
                animations: 'disabled',
            });
            assert.deepEqual(errors, [], `${name}: no browser errors`);
            console.log(`PASS responsive public view: ${name}`);
            await page.close();
        }

        const page = await browser.newPage();
        for (const width of [320, 1440]) {
            await page.setViewportSize({ width, height: 1080 });
            await page.goto(`${root}/topics`);
            await page.locator('main article').first().waitFor();
            const topics = await page
                .locator('main article')
                .getByRole('heading')
                .getByRole('link')
                .evaluateAll((links) =>
                    links.map((link) => ({
                        href: link.getAttribute('href'),
                        title: link.textContent.trim(),
                    })),
                );
            assert.equal(
                topics.length,
                2,
                'Both real preview topics are shown',
            );
            for (const topic of topics) {
                await page
                    .getByRole('heading', { name: topic.title, exact: true })
                    .getByRole('link')
                    .click();
                await page.waitForURL(root + topic.href);
                await page
                    .getByRole('heading', { name: topic.title, level: 1 })
                    .waitFor();
                await page.goBack();
                await page.locator('main article').first().waitFor();
            }
            console.log(`PASS topic navigation at ${width}px`);
        }
        await page.close();
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
