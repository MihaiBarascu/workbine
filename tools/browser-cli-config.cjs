const fs = require('node:fs');
const { chromium } = require('@playwright/test');
if (
    process.env.APP_ENV !== 'testing' ||
    process.env.WORKBINE_BROWSER_PILOT !== '1' ||
    process.env.DB_DATABASE !== '/tmp/workbine-preview.sqlite'
)
    throw new Error('Use the disposable browser container.');
fs.writeFileSync(
    '/tmp/pilot-cli.json',
    JSON.stringify({
        browser: {
            browserName: 'chromium',
            launchOptions: {
                executablePath: chromium.executablePath(),
                headless: true,
                chromiumSandbox: false,
            },
            contextOptions: { viewport: { width: 1440, height: 900 } },
        },
        outputDir: '/tmp/workbine-ui-preview/cli',
    }),
);
