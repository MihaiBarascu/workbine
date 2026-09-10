# Workbine Status

Last updated: 2026-09-11

## Production and development rules

Production: `main` -> Dokploy build -> migrations -> `https://workbine.com`.

The owner explicitly authorizes tested feature development and merges to main. Work in feature branches; run build, formatting/lint, TypeScript, Pint, PHPStan, PHPUnit and browser checks before merging. A green CI run is not proof of deployment. Never commit secrets, generated Wayfinder files or production test content.

Read `README.md`, `AGENTS.md`, this file, `docs/DESIGN.md` and `docs/BACKLOG.md` before continuing.

## Owner's current direction

The owner rejected the generic SaaS landing-page appearance and requested a distinctive real community platform, continued development every three hours, and no ZIP deliverables. Do not report a cron as an active development agent unless model access, code generation, publication and validation have actually been tested. Do not promise that a chat session will wake itself up.

The visual identity is now a shared community notebook: warm paper, carbon-green ink, terracotta details, a custom lowercase wordmark, editorial rules/margins, serif display type and a row-based feed. Keep the established identity. Do not return to an oversized marketing hero, generic feature cards, a rounded initial badge or fake community counters.

## Product capabilities

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

Topics are independent, not hierarchical. Users can create a topic, share concrete methods and report their real experience of another person's method. Public serializers expose author id/name, not private identity fields.

- Literal bounded search across topic title/context combines with Needs a method and stable pagination.
- Experiences record worked / partly worked / did not work, context, optional trial date and a public HTTP/HTTPS evidence link.
- A unique user/method key plus atomic upsert prevents duplicate entries. People can update or remove their own experience, but cannot validate their own method.
- Scoped topic/method routes and contribution throttling remain enforced.
- Outcome totals are self-reported, not independent verification or objective success rates.
- Public topic/experience link copying has a manual-copy fallback.
- The notebook adds an inline question composer and clearly labelled starter prompts. A draft travels through the protected creation URL and login; visiting a draft URL never publishes a topic.

No fake members, seeded production contributions, reputation scores or administration suite are introduced.

## Releases and checks

PR #5 added public discovery. PR #6 added real experiences and search. PR #7 made the live smoke client consistent and reports the actual coverage when production has no content. These are merged.

PR #8 implements the notebook identity. Its source and draft-flow tests passed the full SQLite/PostgreSQL CI and Chromium contribution workflow. Populated desktop/mobile and narrow dark-mode captures were inspected. Check the PR's latest head and merge state; this file describes the checkout, not an assumed deployment.

Current backend coverage after the identity increment: 85 tests, including three new cases for draft validation, authenticated prefilling and guest login preservation. Browser tests cover search/filter recovery, intended login, Topic -> Method creation, Experience create/update/delete, copy links, own-method restrictions and public persistence. Browser assertions check horizontal overflow at 320px/375px and desktop widths, and collect runtime errors.

## Recurring-development readiness

A real GitHub-hosted probe successfully ran pinned GitHub Copilot CLI 1.0.83 with the built-in GITHUB_TOKEN, `copilot-requests: write`, and `--model auto`; the agent returned READY. No additional API key was needed for that probe. It does use the account's applicable Copilot entitlement/usage, not an unlimited free service.

A separate publication probe failed with: `GitHub Actions is not permitted to create or approve pull requests`. The repository owner must enable **Settings -> Actions -> General -> Allow GitHub Actions to create and approve pull requests** before unattended PR creation can succeed. Do not bypass this restriction with direct production pushes or false success reporting.

A three-hour development workflow is being implemented separately. Until it is merged and a real end-to-end cycle has been verified, do not claim autonomous development/deployment is fully active. Initial unattended scope should be small public-UI improvements from a reviewed queue, not authentication, billing, infrastructure or destructive migrations. Failures must remain visible and must never be fixed by disabling tests.

## Stack and infrastructure

Laravel 13, React 19, Inertia 3, TypeScript and the existing Tailwind/shadcn components remain one monolith. Production uses Dokploy PostgreSQL; local defaults are SQLite. CI also tests PostgreSQL 16. No new application dependencies are required by the identity.

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`.

Cloudflare terminates HTTPS. The entrypoint runs migrations and optimization. `/up` is the health check. The Experiences milestone adds only an additive experiences table with cascading foreign keys.

Fortify and Socialite provide authentication. Existing verification behavior is unchanged; the User model does not enforce verification merely because routes mention verified middleware. Real Google OAuth with an actual account is not covered by the synthetic browser tests; existing backend Google tests remain in place. Secrets stay in deployment environment variables.

## Validation boundaries

CI previews use synthetic data on a disposable localhost app. `tests/browser/community-flow.cjs` is intentionally hard-coded to localhost and must never be pointed at production because it writes test content. Screenshots are internal review artifacts, not deliverables requested from the user.

Live checks are read-only. Chromium and service-identified requests have successfully opened workbine.com with HTTP 200 and the deployed search input. A prior bare Python request returned HTTP 403; this does not identify a particular Cloudflare rule or prove the app was unavailable. No Cloudflare security settings were changed.

The production smoke checks health/search/listing and only samples topic/experience pages if real content exists. A zero sampled count is not coverage of those flows. Keep live availability, synthetic functional tests, and actual growth metrics distinct.
