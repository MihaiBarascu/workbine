// Only for the isolated preview database; exercise the real signed verification route.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

module.exports = async function verifyAccount(page, email) {
    assert.equal(process.env.APP_ENV, 'testing');
    assert.equal(process.env.DB_CONNECTION, 'sqlite');
    assert.equal(process.env.DB_DATABASE, '/tmp/workbine-preview.sqlite');
    assert.equal(new URL(page.url()).origin, 'http://127.0.0.1:8000');
    const link = execFileSync(
        'php',
        [
            '-r',
            `
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        $user = App\\Models\\User::where('email', $argv[1])->firstOrFail();
        echo Illuminate\\Support\\Facades\\URL::temporarySignedRoute(
            'verification.verify', now()->addMinutes(10),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
    `,
            email,
        ],
        { encoding: 'utf8' },
    ).trim();
    assert.equal(new URL(link).origin, 'http://127.0.0.1:8000');
    await page.goto(link);
    await page.waitForURL(/\/topics(?:\?.*)?$/);
};
