# Workbine Status

Last updated: 2026-09-11

## Production and owner direction

Production is `main` -> Dokploy build/migrations -> `https://workbine.com`. The owner authorizes tested feature work and merges, asks for development every three hours, and does not want ZIP deliverables. Do not claim audience growth without real metrics or claim a chat will automatically reopen.

Read README.md, AGENTS.md, this file, docs/DESIGN.md and docs/BACKLOG.md before changing anything. Keep the Laravel 13 + React 19 + Inertia 3 + TypeScript monolith. Production uses PostgreSQL; local defaults are SQLite.

## Current product

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`.

Topics are independent. Public search across title/context combines with Needs a method and stable pagination. People can share concrete methods and report positive, partial or negative experiences with context, an optional trial date and public evidence URL. Unique user/method entries, atomic updates, own-entry removal, scoped topic/method access, no author self-validation and contribution throttling are in place. Public author serializers omit private identity data. Outcomes are self-reported, not independently verified success rates.

PRs #5, #6 and #7 added public discovery, real experiences/search, and clearer production smoke checks. PR #8 is merged and establishes the distinct community-notebook identity: warm paper, carbon-green ink, terracotta details, custom lowercase wordmark, serif display type, editorial margins/rules and a readable row-based feed. Keep this identity rather than returning to generic SaaS heroes or repeated floating cards.

The notebook composer carries a draft through the protected creation URL and login without publishing it. Starter prompts are explicitly labelled prompts, never fabricated community activity. Copy-link controls include a manual fallback.

The identity passed all 85 application tests on SQLite and PostgreSQL, frontend build, formatting/lint, TypeScript, Pint, PHPStan and the real Chromium contribution flow. Desktop/mobile and narrow dark-mode captures were reviewed. Deployment must still be checked separately for every release.

## Three-hour continuation

The configured GitHub Actions workflow is `.github/workflows/continuous-development.yml`, with `17 */3 * * *` in UTC, manual dispatch and an initial main-push trigger for controller changes. See docs/AUTOMATION.md for the exact limits, controls and activation status; docs/AUTODEV_TASKS.json is the reviewed initial task queue.

The model gets a copied workspace, read-only repository access and restricted file tools. A separate deterministic publisher handles a single feature branch. Full database CI and Chromium checks are reused against the exact candidate SHA before any PR/merge attempt. Stylesheet changes require human visual review. No direct production push, force push, test weakening, authentication change, secret access, fake content or dependency update is permitted by an unattended UI task.

Model access was genuinely verified: pinned GitHub Copilot CLI 1.0.83, model auto, scoped GITHUB_TOKEN and copilot-requests permission returned READY. This consumes the account's applicable Copilot entitlement/usage; it is not unlimited free inference.

Automatic PR publication was separately tested and rejected with `GitHub Actions is not permitted to create or approve pull requests`. The owner must enable **Settings -> Actions -> General -> Allow GitHub Actions to create and approve pull requests**. Until a complete cycle succeeds, distinguish configured scheduling/code generation from fully automatic release. Do not bypass this policy. Pending branches are reused and publication retried instead of generating duplicates. Conflicts and persistent failed checks require review.

Seven controller unit tests verify scope rejection and basic unsafe-content/size guards. These guards are defense in depth, not a proof that all generated code is correct. A completed queue produces a no-op rather than artificial work. Extend it with reviewed useful tasks. Repository variables can pause the schedule or disable automatic merges.

## Validation and privacy boundaries

CI runs build, formatting/lint, TypeScript, Pint, PHPStan and PHPUnit against SQLite and PostgreSQL 16. The public browser workflow tests search/filter recovery, intended login, Topic -> Method creation, Experience create/update/delete, copy links, own-method restrictions, public persistence, horizontal overflow and runtime errors. Internal screenshots are for review, not ZIP deliverables to the owner.

The browser test is hard-coded to localhost and uses disposable synthetic data; never point it at production. Live smoke checks are read-only and sample topic/experience pages only if existing real content is available. Zero sampled pages is not coverage of those flows. Real Google OAuth with an actual account is not exercised by the synthetic browser test; the existing backend Google tests remain.

Fortify/Socialite authentication is unchanged. The User model does not enforce verification merely because routes mention verified middleware. Secrets and production environment values stay out of Git. No generated Wayfinder files, artificial reputation, seeded production contributions or generic admin suite are introduced.

## Infrastructure and access

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`.

Cloudflare terminates HTTPS. Dokploy provides PostgreSQL. The entrypoint runs migrations and optimization; `/up` is the health check. The Experiences migration is additive and uses cascading foreign keys.

Chromium and service-identified HTTP requests have opened workbine.com with HTTP 200. A prior bare Python probe returned HTTP 403; this does not identify a specific Cloudflare rule or demonstrate an outage. No Cloudflare security configuration was changed. Check actual workflow conclusions, browser output and Dokploy state rather than inferring deployment from a merge or CI alone.
