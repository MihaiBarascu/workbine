import { test as base, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
const exec = promisify(execFile);
export type Actor = {
    id: number;
    name: string;
    email: string;
    username: string;
    password: string;
};
export type Actors = {
    token: string;
    owner: Actor;
    contributor: Actor;
    reviewer: Actor;
    topic: { id: number; title: string; slug: string };
    method: { id: number; title: string };
};
export const test = base.extend<{ actors: Actors; _pilotVariant: void }>({
    _pilotVariant: [
        async ({ context }, use, testInfo) => {
            const variant = process.env.WORKBINE_PILOT_VARIANT ?? 'baseline';
            const markFault = () =>
                testInfo.annotations.push({
                    type: 'injected-fault',
                    description: variant,
                });
            if (variant === 'layout') {
                await context.addInitScript(() => {
                    document.addEventListener('DOMContentLoaded', () => {
                        const style = document.createElement('style');
                        style.textContent =
                            '.wb-topic-card { border-radius: 24px !important; box-shadow: none !important; } .wb-card-content { flex-direction: row-reverse !important; } button[type=submit] { border-radius: 2px !important; letter-spacing: .04em !important; }';
                        document.head.append(style);
                    });
                });
            } else if (variant === 'broken-save') {
                await context.route('**/topics/*/saved', (route) =>
                    route.request().method() === 'PUT'
                        ? (markFault(), route.abort('failed'))
                        : route.continue(),
                );
            } else if (variant === 'broken-publish') {
                await context.route('**/topics', (route) =>
                    route.request().method() === 'POST'
                        ? (markFault(), route.abort('failed'))
                        : route.continue(),
                );
            } else if (variant === 'broken-ownership') {
                await context.route('**/topics/*/edit', async (route) => {
                    const response = await route.fetch();
                    if (response.status() === 403) markFault();
                    await route.fulfill({
                        response,
                        status:
                            response.status() === 403 ? 200 : response.status(),
                    });
                });
            } else if (variant !== 'baseline')
                throw new Error('Unknown pilot variant');
            await use();
        },
        { auto: true },
    ],
    actors: async ({ baseURL }, use) => {
        if (baseURL !== 'http://127.0.0.1:8000')
            throw new Error('Unexpected browser origin');
        const token = randomBytes(10).toString('hex');
        const { stdout } = await exec('php', [
            'tests/e2e/seed.php',
            'create',
            token,
        ]);
        try {
            await use(JSON.parse(stdout));
        } finally {
            await exec('php', ['tests/e2e/seed.php', 'cleanup', token]);
        }
    },
});
export { expect };
export async function login(page: Page, actor: Actor) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(actor.email);
    await page.getByLabel('Password', { exact: true }).fill(actor.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/topics$/);
}
// A valid synthetic PNG; uploaded and processed through the actual editor endpoint.
export const imageFile = {
    name: 'pilot.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAUAAAADICAIAAAAWZq/8AAACYElEQVR4nO3TQQ0AIBDAsJOIMIQhCw98yJImFbDPZu0DRM33AuCZgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEXBPtAB25rAdgAAAAASUVORK5CYII=',
        'base64',
    ),
};
