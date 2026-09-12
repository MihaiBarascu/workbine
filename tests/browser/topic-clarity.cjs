// Imported by community-flow.cjs after login. Only the disposable preview app.
const assert = require('node:assert/strict');
const { exerciseDiscoveryDraft } = require('./discovery-draft.cjs');

async function exerciseTopicClarity(page, root, output) {
    assert.equal(new URL(root).origin, 'http://127.0.0.1:8000');
    await exerciseDiscoveryDraft(page, root, output);
    const idea = 'Making time to learn after work';
    const ownTitle = 'My own topic title, before choosing an idea';

    async function layoutFits() {
        assert.equal(
            await page.evaluate(
                () =>
                    document.documentElement.scrollWidth <=
                    window.innerWidth + 1,
            ),
            true,
            'The discovery and composer must fit without horizontal scrolling',
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

    await page.goto(`${root}/topics`);
    await page.locator('#new-topic').waitFor();
    const initialTopics = await page.locator('main article').count();
    await page.locator('#new-topic').fill(ownTitle);
    await page
        .getByRole('button', { name: `Use idea: ${idea}`, exact: true })
        .click();
    assert.equal(await page.locator('#new-topic').inputValue(), idea);
    assert.equal(
        await page
            .locator('#new-topic')
            .evaluate((input) => document.activeElement === input),
        true,
    );
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(
        await page.locator('#new-topic').inputValue(),
        ownTitle,
        'Undo restores the previous title',
    );
    await page
        .getByRole('button', { name: `Use idea: ${idea}`, exact: true })
        .click();
    await page.locator('#new-topic').fill(`${idea} with a busy schedule`);
    assert.equal(
        await page.getByRole('button', { name: 'Undo', exact: true }).count(),
        0,
        'Editing ends the undo hint',
    );
    await page.getByText('See a simple example', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await page
        .getByText('Illustration only, not a community post.', { exact: true })
        .waitFor();
    await layoutFits();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForURL(/\/topics\/create\?/);
    assert.equal(
        await page.locator('#title').inputValue(),
        `${idea} with a busy schedule`,
    );
    assert.equal(
        await page
            .getByRole('link', { name: 'Start a topic', exact: true })
            .count(),
        0,
        'No redundant start action on the composer',
    );
    assert.equal(
        await page.locator('#description').getAttribute('required'),
        null,
        'Context is optional',
    );
    await page
        .getByText('A little context', { exact: false })
        .first()
        .waitFor();
    assert.equal(await page.locator('#first-method-fields').isVisible(), false);
    assert.equal(await page.locator('#method_title').isDisabled(), true);

    const include = page.getByRole('checkbox', {
        name: 'Add my method too',
        exact: true,
    });
    await include.focus();
    await page.keyboard.press('Space');
    assert.equal(
        await include.isChecked(),
        true,
        'Method choice supports keyboard input',
    );
    await page.locator('#method_title').fill('One small step after dinner');
    await page
        .locator('#method_body')
        .fill(
            'I practised one small task after dinner, then wrote down what helped. A reminder made it easier to remember.',
        );
    await page.locator('#method_source_url').fill('https://example.com/source');
    await include.uncheck();
    const inactiveData = await page.locator('#title').evaluate((input) => {
        const data = new FormData(input.form);
        return [...data.keys()];
    });
    assert.equal(inactiveData.includes('method_title'), false);
    assert.equal(inactiveData.includes('method_body'), false);
    assert.equal(
        inactiveData.includes('method_source_url'),
        false,
        'Inactive method fields are not submitted',
    );
    await include.check();
    assert.equal(
        await page.locator('#method_title').inputValue(),
        'One small step after dinner',
    );
    assert.ok(
        (await page.locator('#method_body').inputValue()).includes(
            'A reminder',
        ),
    );
    assert.equal(
        await page.locator('#method_source_url').inputValue(),
        'https://example.com/source',
    );
    await page.getByText('Need a little guidance?', { exact: true }).click();
    await page
        .getByText('What should someone do first, then next?', { exact: true })
        .waitFor();

    for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const colorScheme of ['light', 'dark']) {
            await appearance(colorScheme);
            for (const withMethod of [false, true]) {
                await include.setChecked(withMethod);
                await layoutFits();
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({
                    path: `${output}/topic-clarity-${width}-${colorScheme}-${withMethod ? 'method' : 'simple'}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
            }
        }
    }

    // A browser-valid URL the existing server rejects; nothing is published.
    await page.locator('#method_source_url').fill('ftp://example.com/source');
    await page
        .getByRole('button', {
            name: 'Publish topic & method',
            exact: true,
        })
        .click();
    await page
        .getByRole('heading', {
            name: 'Check the highlighted fields',
            exact: true,
        })
        .waitFor();
    await page.waitForFunction(() =>
        document.activeElement?.classList.contains('wb-form-errors'),
    );
    await page
        .locator('.wb-form-errors')
        .getByRole('link', { name: 'Source link', exact: true })
        .click();
    assert.equal(
        await page
            .locator('#method_source_url')
            .evaluate((input) => document.activeElement === input),
        true,
    );
    assert.equal(
        await page.locator('#method_source_url').getAttribute('aria-invalid'),
        'true',
    );
    assert.ok(
        (
            await page
                .locator('#method_source_url')
                .getAttribute('aria-describedby')
        ).includes('method_source_url-error'),
    );
    await include.uncheck();
    await page.locator('.wb-form-errors').waitFor({ state: 'detached' });
    assert.equal(
        await page.locator('.wb-form-errors').count(),
        0,
        'Hiding an optional method clears its stale validation errors',
    );
    await include.check();
    assert.equal(
        await page.locator('#method_source_url').inputValue(),
        'ftp://example.com/source',
        'Clearing errors does not erase the draft',
    );

    // Browser-only empty-state fixture. Never delete seeded or production data.
    await page.route(
        `${root}/topics`,
        async (route) => {
            assert.equal(route.request().headers()['x-inertia'], 'true');
            const response = await route.fetch();
            assert.equal(response.ok(), true);
            const fixture = await response.json();
            assert.equal(fixture.component, 'topics/index');
            fixture.props.topics = {
                ...fixture.props.topics,
                data: [],
                total: 0,
                current_page: 1,
                last_page: 1,
                prev_page_url: null,
                next_page_url: null,
                from: null,
                to: null,
            };
            await route.fulfill({ response, json: fixture });
        },
        { times: 1 },
    );
    await page
        .getByRole('link', { name: 'Back to topics', exact: true })
        .click();
    await page
        .getByRole('heading', {
            name: 'A small thing you know can help someone else.',
            exact: true,
        })
        .waitFor();
    assert.equal(await page.locator('main article').count(), 0);
    assert.equal(await page.locator('.wb-starter-options button').count(), 3);
    assert.equal(await page.locator('.wb-topic-count').count(), 0);
    await page
        .getByText('Ideas to make your own, not published topics.', {
            exact: true,
        })
        .waitFor();
    for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const colorScheme of ['light', 'dark']) {
            await appearance(colorScheme);
            await layoutFits();
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({
                path: `${output}/topic-empty-fixture-${width}-${colorScheme}.png`,
                fullPage: true,
                animations: 'disabled',
            });
        }
    }

    await appearance('light');
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.goto(`${root}/topics`);
    await page.locator('#new-topic').waitFor();
    assert.equal(
        await page.locator('main article').count(),
        initialTopics,
        'Rejected draft did not publish a topic; the fixture changed no data',
    );
    console.log(
        'PASS topic clarity: idea undo, keyboard controls, optional payload, retained drafts, error focus and responsive captures',
    );
}

module.exports = { exerciseTopicClarity };
