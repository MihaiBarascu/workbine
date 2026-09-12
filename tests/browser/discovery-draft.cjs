// Only the disposable preview application. Never writes production data.
const assert = require('node:assert/strict');

async function exerciseDiscoveryDraft(page, root, output) {
    assert.equal(new URL(root).origin, 'http://127.0.0.1:8000');
    const ownTitle = 'Learning after work';
    const idea = 'Making time to learn after work';
    const writes = [];
    const recordRequest = (request) => {
        if (
            new URL(request.url()).origin === root &&
            !['GET', 'HEAD'].includes(request.method())
        ) {
            writes.push(`${request.method()} ${request.url()}`);
        }
    };
    page.on('request', recordRequest);

    async function listingReady(search, view) {
        await page.waitForFunction(
            ({ search, view }) =>
                document.querySelector('#topic-search')?.value === search &&
                document.querySelector('.wb-search input[name="view"]')
                    ?.value === view,
            { search, view },
        );
    }

    async function draftIs(expected) {
        assert.equal(
            await page.locator('#new-topic').inputValue(),
            expected,
            'Discovery navigation must preserve the unfinished topic title',
        );
    }

    async function appearance(colorScheme) {
        await page.emulateMedia({ colorScheme });
        await page.waitForFunction(
            (dark) =>
                document.documentElement.classList.contains('dark') === dark,
            colorScheme === 'dark',
        );
    }

    const fixturePattern = `${root}/topics?*`;
    let fixtureHandler;
    try {
        await page.goto(`${root}/topics`);
        await listingReady('', 'latest');
        await page.locator('#new-topic').fill(ownTitle);
        await page
            .getByRole('link', { name: 'Needs a method', exact: true })
            .click();
        await listingReady('', 'unanswered');
        await draftIs(ownTitle);
        await page.getByRole('link', { name: 'Latest', exact: true }).click();
        await listingReady('', 'latest');
        await draftIs(ownTitle);

        await page
            .getByRole('button', { name: `Use idea: ${idea}`, exact: true })
            .click();
        await page
            .getByRole('searchbox', { name: 'Search topics' })
            .fill('  customer  ');
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await listingReady('customer', 'latest');
        await page.locator('.wb-search-state').waitFor();
        await draftIs(idea);
        await page
            .getByRole('link', { name: 'Needs a method', exact: true })
            .click();
        await listingReady('customer', 'unanswered');
        await page
            .getByRole('heading', {
                name: 'No matching topics yet',
                exact: true,
            })
            .waitFor();
        await draftIs(idea);
        await page
            .getByRole('link', { name: 'Clear search', exact: true })
            .click();
        await listingReady('', 'unanswered');
        await page.locator('.wb-search-state').waitFor({ state: 'detached' });
        await draftIs(idea);
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        await draftIs(ownTitle);
        await page.getByRole('link', { name: 'Latest', exact: true }).click();
        await listingReady('', 'latest');

        await page
            .getByRole('button', { name: `Use idea: ${idea}`, exact: true })
            .click();
        await page
            .getByRole('searchbox', { name: 'Search topics' })
            .fill('workbine-draft-no-match');
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await listingReady('workbine-draft-no-match', 'latest');
        await page
            .getByRole('heading', {
                name: 'No matching topics yet',
                exact: true,
            })
            .waitFor();
        await draftIs(idea);
        for (const width of [320, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const colorScheme of ['light', 'dark']) {
                await appearance(colorScheme);
                assert.equal(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <=
                            window.innerWidth + 1,
                    ),
                    true,
                    'The retained title and recovery actions must fit the viewport',
                );
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({
                    path: `${output}/discovery-title-${width}-${colorScheme}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
            }
        }
        await page
            .getByRole('link', { name: 'Explore all topics', exact: true })
            .click();
        await listingReady('', 'latest');
        await draftIs(idea);

        // Split existing preview topics into two browser-only pages. This tests
        // both pagination links without seeding extra posts or changing the DB.
        let sampleTopics;
        const requestedPages = [];
        fixtureHandler = async (route) => {
            assert.equal(route.request().method(), 'GET');
            assert.equal(route.request().headers()['x-inertia'], 'true');
            const response = await route.fetch();
            assert.equal(response.ok(), true);
            const fixture = await response.json();
            assert.equal(fixture.component, 'topics/index');
            sampleTopics ??= fixture.props.topics.data.slice(0, 2);
            assert.equal(sampleTopics.length, 2);
            const currentPage = Number(
                new URL(route.request().url()).searchParams.get('page') || 1,
            );
            assert.ok([1, 2].includes(currentPage));
            requestedPages.push(currentPage);
            fixture.props.topics = {
                ...fixture.props.topics,
                data: sampleTopics.slice(currentPage - 1, currentPage),
                total: 2,
                per_page: 1,
                current_page: currentPage,
                last_page: 2,
                from: currentPage,
                to: currentPage,
                prev_page_url:
                    currentPage === 2
                        ? `${root}/topics?view=latest&q=&page=1`
                        : null,
                next_page_url:
                    currentPage === 1
                        ? `${root}/topics?view=latest&q=&page=2`
                        : null,
            };
            await route.fulfill({ response, json: fixture });
        };
        await page.route(fixturePattern, fixtureHandler);
        await page.getByRole('link', { name: 'Latest', exact: true }).click();
        await page.getByText('Page 1 of 2', { exact: true }).waitFor();
        await draftIs(idea);
        await page.getByRole('link', { name: 'Next', exact: true }).click();
        await page.getByText('Page 2 of 2', { exact: true }).waitFor();
        await draftIs(idea);
        assert.equal(new URL(page.url()).searchParams.get('page'), '2');
        await page.getByRole('link', { name: 'Previous', exact: true }).click();
        await page.getByText('Page 1 of 2', { exact: true }).waitFor();
        await draftIs(idea);
        assert.deepEqual(requestedPages, [1, 2, 1]);
        await page.unroute(fixturePattern, fixtureHandler);
        fixtureHandler = undefined;

        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        await draftIs(ownTitle);
        await page
            .getByRole('button', { name: 'Continue', exact: true })
            .click();
        await page.waitForURL(/\/topics\/create\?/);
        assert.equal(await page.locator('#title').inputValue(), ownTitle);
        await page
            .getByRole('link', { name: 'Back to topics', exact: true })
            .click();
        await listingReady('', 'latest');
        await draftIs('');
        assert.deepEqual(
            writes,
            [],
            'Exploring a draft never publishes content',
        );
        console.log(
            'PASS discovery draft: filters, normalized search, clear, empty recovery, pagination fixture, Undo, title handoff and no writes',
        );
    } finally {
        if (fixtureHandler) {
            await page.unroute(fixturePattern, fixtureHandler);
        }
        page.off('request', recordRequest);
        await appearance('light');
        await page.setViewportSize({ width: 1440, height: 1080 });
    }
}

module.exports = { exerciseDiscoveryDraft };
