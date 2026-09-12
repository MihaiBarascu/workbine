#!/usr/bin/env bash
# Called only inside the disposable local testing image.
set -euo pipefail
[[ "$APP_ENV" == testing && "$DB_HOST" == postgres && -f /source.tar ]]
finish() {
    workbine_status=$?
    trap - EXIT
    if [[ -d /tmp/workbine-ui-preview ]]; then
        cp -R /tmp/workbine-ui-preview/. /artifacts/
    fi
    if [[ -f storage/logs/laravel.log ]]; then
        cp storage/logs/laravel.log /artifacts/laravel.log
    fi
    chown -R "$LOCAL_UID:$LOCAL_GID" /artifacts
    exit "$workbine_status"
}
trap finish EXIT
cp .env.example .env
mkdir -p storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache
composer install --prefer-dist --no-interaction --no-progress
php artisan key:generate
npm ci
php artisan wayfinder:generate --with-form --no-interaction
npm run build
python3 -m unittest discover -s tools -p test_autodev.py -v
composer ci:check
DB_CONNECTION=pgsql DB_DATABASE=workbine_test php artisan test --compact
export DB_CONNECTION=sqlite DB_DATABASE=/tmp/workbine-preview.sqlite
export MEDIA_ENABLED=true MEDIA_DISK=public
export COMMUNITY_REPORTS_ENABLED=true APP_DEBUG=false
touch "$DB_DATABASE"
php artisan migrate --force --no-interaction
php tools/seed-preview.php
php artisan storage:link --no-interaction
php artisan serve --no-reload --host=127.0.0.1 --port=8000 > /artifacts/server.log 2>&1 &
for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:8000/up > /dev/null; then
        break
    fi
    sleep 1
done
curl --fail --silent http://127.0.0.1:8000/up > /dev/null
mkdir -p /tmp/workbine-ui-preview
node tests/browser/capture-public.cjs
node tests/browser/community-flow.cjs
node tests/browser/profile-flow.cjs
node tests/browser/media-flow.cjs
node tests/browser/launch-flow.cjs
php -S 127.0.0.1:8001 -t public tests/browser/turnstile-router.php > /artifacts/turnstile-server.log 2>&1 &
for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:8001/up > /dev/null; then
        break
    fi
    sleep 1
done
node tests/browser/turnstile-flow.cjs
node tests/browser/turnstile-widget.cjs
printf '\nPASS: local build, lint, types, PHP, SQLite, PostgreSQL and browser flows.\n'
