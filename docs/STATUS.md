# Workbine Status

Last updated: 2026-09-10

## Production and release process

Production branch: `main`. Domain: `https://workbine.com`.

`push / reviewed merge to main -> Dokploy build -> migrations -> deployment`

The user explicitly authorized feature development and merges to main after validation. Continue using feature branches and green checks; do not push unfinished work directly to production.

This document describes the code in this checkout. A feature is live only after its revision is on main and Dokploy finishes deployment. CI success alone does not prove deployment success.

## Current product capabilities

Core model:

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

Topics are independent; there is no parent/child hierarchy. Methods describe a concrete approach someone tried or clearly attribute an external source.

Milestones:

- Initial Topic + Method creation, public listing/detail, Fortify authentication and Google login.
- PR #5: community-oriented public UI, actual method counts, Needs a method filter, stable pagination, mobile/dark-mode styles and public UI previews. Merged to main on 2026-09-10.
- PR #6: real experiences and topic search. Check the PR merge state and latest checks for its release status.

This revision adds:

- bounded, literal substring search across topic titles and context, combined with Needs a method and pagination
- public method experiences with worked / partly worked / did not work outcomes, required context, optional trial date and public evidence URL
- one experience per user per method, enforced by a unique database key and atomic upsert; editing replaces the earlier entry
- own-entry removal, scoped Topic -> Method access, no self-validation by a method's author
- a shared limit of 20 contribution mutations per minute per authenticated user
- real outcome totals and paginated experience lists, exposing only public author id/name
- topic/experience link copying with a manual-copy fallback when clipboard access is denied
- a shorter mobile introduction that brings search and community content closer to the top

Outcomes are self-reported, not independently verified evidence or an objective success rate. Do not label them verified or add reputation rewards merely because an outcome is positive. No fake community contributions or seeded content are published to production.

## Architecture and data

Laravel 13 + React 19 + Inertia 3 + TypeScript, kept as one monolith. Production uses PostgreSQL. Local defaults remain SQLite.

The community participation milestone adds only `experiences`; it does not rewrite existing production tables or rows. Foreign keys cascade when the associated user/method is deleted. The migration is additive and should run before the new application begins serving requests through the existing Dokploy entrypoint.

No new application dependencies, recommendation engine, reputation system or admin panel are introduced.

## Authentication and privacy

- Fortify provides email/password authentication; Socialite provides Google login.
- Existing email-verification behavior is unchanged; do not assume that the User model enforces verification merely because routes have the verified middleware.
- Google users are linked by verified email where appropriate.
- Google secrets, APP_KEY and production credentials stay in environment variables, never in the repository.
- Experience evidence is a user-provided HTTP/HTTPS link, not an uploaded or automatically fetched document. Users are reminded not to share secrets, private documents or customer data.
- Public serializers deliberately omit email, Google identity fields and authentication secrets.

## CI and browser validation

`.github/workflows/ci.yml` runs on PRs to main, pushes to main and manual dispatch. It generates Wayfinder files, builds the frontend and runs formatting, lint, TypeScript, PHP formatting, PHPStan and PHPUnit. The suite now runs against both SQLite and PostgreSQL 16. Failures stay failures; formatter suggestions and test diagnostics are uploaded separately for debugging.

`.github/workflows/ui-preview.yml` builds a disposable local app with synthetic users/content, captures desktop/mobile/light/dark screenshots, and exercises search, filter composition, intended login, Topic -> Method creation, experience create/update/delete, author restrictions and link copying in Chromium. It checks horizontal overflow at 320px/375px and desktop widths and records browser runtime errors. Browser dependencies are installed in a temporary directory, not added to the application.

`tests/browser/community-flow.cjs` is intentionally hard-coded to localhost. It must never be pointed at production because it creates and deletes test content. Screenshots remain in the `workbine-public-ui-preview` artifact for seven days.

`.github/workflows/production-smoke.yml` runs after pushes to main and can also be dispatched manually. It retries read-only public HTTP checks while Dokploy deploys. It checks health/search and available topic/experience pages, never creates production data, and does not prove a particular deployed commit hash or complete an authenticated Google login.

Use actual workflow conclusions on the latest commit as the source of truth. Review screenshot artifacts rather than treating screenshot generation as visual approval.

## Infrastructure

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`

Cloudflare terminates public HTTPS. PostgreSQL is provided by Dokploy. `/up` is the health check. The entrypoint runs migrations with `--force` and Laravel optimization commands.

ChatGPT's web fetcher or local execution environment may fail to resolve/open workbine.com even when it works in the user's browser. This is not proof of an outage or a Cloudflare block. Prefer the GitHub-hosted read-only smoke result, the user's browser or actual Dokploy logs. Do not disable Cloudflare security based on a generic fetch error.

## Next product work

1. Observe real onboarding and the first genuine Topic -> Method -> Experience contributions. Improve friction revealed by actual use.
2. Add focused discovery/sharing improvements and a useful opt-in return path (for example following a topic) when the delivery and privacy requirements are clear.
3. Add contribution editing/reporting and small operational moderation tools as recurring needs become visible; do not build a generic admin suite in advance.
4. Introduce reputation only after useful, trustworthy contribution signals exist. Preserve negative/partial experiences rather than incentivizing positive reports.

Traffic acquisition and a large community require real distribution, contributors and retention. Shipping features is not evidence of audience growth. Keep claims tied to measured activity, not invented counts.

## Development rules

Read `README.md`, `AGENTS.md` and this file before changing the project. Work in feature branches, run all checks before merging, keep migrations safe for existing PostgreSQL data, never commit generated Wayfinder files or secrets, and prefer the existing stack over additional infrastructure.
