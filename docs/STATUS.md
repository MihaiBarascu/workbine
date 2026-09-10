# Workbine Status

Last updated: 2026-09-10

## Current state

Production branch: `main`

Latest product milestone merged to `main`:

- renamed the product concept from Goal to Topic
- added Topic listing, detail and creation flow
- removed the generic Laravel Dashboard from the main product navigation
- authenticated users are routed back into the Workbine experience
- added Methods under Topics
- authenticated users can share a Method with title, body and optional source URL
- Topic pages display their Methods
- Google authentication via Laravel Socialite is implemented
- PostgreSQL migrations exist for Topics, Methods and Google identity fields
- permanent CI workflow now runs on pushes to `main` and pull requests targeting `main`

The CI run for the Topic + Method milestone passed successfully on `main`.

## Feature work in review

Branch: `feat/community-topic-discovery`

Pull request: `#5` — Improve public topic discovery and community reading experience.

This branch is not deployed. Do not confuse its changes with the current production milestone above. Check the PR's merge state and latest commit checks before continuing.

Implemented on the branch:

- database-backed `Needs a method` filter (`view=unanswered`) on both public listing routes
- deterministic topic ordering and pagination that preserves the selected filter
- public topic feed with real method counts, author names, dates and distinct empty states
- responsive public navigation, teal visual identity, keyboard skip link and a small footer
- more readable method cards, source attribution and `#method-{id}` links
- long-text wrapping and dark-mode styling, without implying independent method verification
- eight additional PHPUnit feature tests for filtering, pagination, private-author-data exclusion, method isolation, intended-login redirects and first contributions
- formatter suggestions in failed CI logs; failures still fail the quality gate
- an isolated Public UI preview workflow with synthetic data and desktop/mobile/light/dark screenshots

No database migrations, new application dependencies, reputation system or admin panel are introduced by this work.

Validation handoff:

- use the latest CI run on the PR head as the source of truth for build, formatting, lint, TypeScript, PHPStan and PHPUnit results
- review the `workbine-public-ui-preview` artifact from the Public UI preview workflow; screenshot capture alone is not a functional end-to-end browser test
- preview data exists only in an ephemeral SQLite database on the CI runner, never in production
- live production browser validation is not yet confirmed; the web fetcher rejecting the domain does not establish an outage
- before release, review narrow-screen navigation, long author names, source links, filtered pagination, empty states and the authenticated Topic -> Method creation forms

## Product model

Current direction:

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

A Topic is an independent practical question or subject. Topics do not have parent/child hierarchy.

A Method is a concrete way someone says worked for them, or a method clearly attributed to an external source.

The product should feel like getting useful advice from a knowledgeable friend. Avoid generic SEO/article UX and avoid turning the product into an admin-style dashboard.

## Authentication

- email/password auth comes from the Laravel starter kit / Fortify
- Google login uses Laravel Socialite
- Google users are linked by verified email when appropriate
- Google Client ID / Client Secret live only in production environment variables
- do not commit OAuth secrets

## Production infrastructure

Domain: `https://workbine.com`

Deployment:

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`

Notes:

- Cloudflare terminates HTTPS for `workbine.com`
- Workbine is routed through Cloudflare Tunnel so public inbound ports do not need to be exposed for the app
- Dokploy deploys from `main`
- Docker entrypoint runs `php artisan migrate --force` and Laravel optimize commands
- PostgreSQL is provided natively through Dokploy
- `/up` is the container health check endpoint

ChatGPT web fetching may sometimes report a DNS/cache miss for `workbine.com` even when the site is reachable normally in a browser. Do not treat that alone as evidence that production is down. Use Dokploy logs, browser testing, or a GitHub-hosted smoke test when necessary.

## CI

`.github/workflows/ci.yml` runs on:

- pushes to `main`
- pull requests targeting `main`
- manual workflow dispatch

It installs dependencies, generates Wayfinder routes, builds the frontend, and runs the repository quality/test checks. Failed jobs print formatting suggestions without changing any repository files remotely or weakening the checks.

`.github/workflows/ui-preview.yml` runs on pull requests targeting `main` and manual dispatch. It builds an isolated test application and uploads public-page screenshots for review, retained for seven days. It does not deploy the application or write production data.

## Next product work

Priorities, in order:

1. Finish reviewing PR #5 and validate the Topic -> Method experience visually and functionally before release.
2. Validate the live production flow after a reviewed, green merge; do not infer deployment success from CI alone.
3. Add real Experience / validation actions around Methods (`I tried this`, context, evidence) without overcomplicating the model.
4. Introduce reputation only after useful contribution/validation signals exist.
5. Add moderation/admin UI only when recurring operational needs justify it; until then prefer safe Artisan commands or small operational tools.

## Development rules

Before changing the project, read:

- `README.md`
- `AGENTS.md`
- this file

Do not redesign the architecture without a concrete need. Prefer the existing Laravel + React + Inertia monolith and keep development/maintenance cost low.
