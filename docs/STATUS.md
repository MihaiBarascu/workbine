# Workbine Status

Last updated: 2026-09-11

## Production and owner direction

Production is `main` -> Dokploy build/migrations -> `https://workbine.com`. The owner authorizes tested feature work and merges and does not want ZIP deliverables. On 2026-09-11 the owner explicitly requested stopping the GitHub coding agent and removing its cron. This revokes the earlier request for unattended development every three hours. Do not recreate or restart a scheduled coding agent without a new explicit request. Do not claim audience growth without real metrics or claim a chat will automatically reopen.

Read README.md, AGENTS.md, this file, docs/DESIGN.md and docs/BACKLOG.md before changing anything. Keep the Laravel 13 + React 19 + Inertia 3 + TypeScript monolith. Production uses PostgreSQL; local defaults are SQLite.

## Current product

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`.

Topics are independent. Public search across title/context combines with Needs a method and stable pagination. People can share concrete methods and report positive, partial or negative experiences with context, an optional trial date and public evidence URL. Unique user/method entries, atomic updates, own-entry removal, scoped topic/method access, no author self-validation and contribution throttling are in place. Public author serializers omit private identity data. Outcomes are self-reported, not independently verified success rates.

PRs #5, #6 and #7 added public discovery, real experiences/search, and clearer production smoke checks. PR #8 is merged and establishes the distinct community-notebook identity: warm paper, carbon-green ink, terracotta details, custom lowercase wordmark, serif display type, editorial margins/rules and a readable row-based feed. Keep this identity rather than returning to generic SaaS heroes or repeated floating cards.

The notebook composer carries a draft through the protected creation URL and login without publishing it. Starter prompts are explicitly labelled prompts, never fabricated community activity. Copy-link controls include a manual fallback.

The identity passed all 85 application tests on SQLite and PostgreSQL, frontend build, formatting/lint, TypeScript, Pint, PHPStan and the real Chromium contribution flow. Desktop/mobile and narrow dark-mode captures were reviewed. Deployment must still be checked separately for every release.

## Automated development stopped

The owner requested stopping the agent and removing the cron on 2026-09-11. `.github/workflows/continuous-development.yml` is removed from this revision, including its three-hour schedule, manual-dispatch trigger and controller-change push trigger. No replacement coding schedule is introduced.

Do not enable the old Actions PR-creation prerequisite, restore the deleted workflow, rerun historical coding-agent jobs or resume the pending `automation/workbine-continuation` branch on the basis of older instructions. Any new unattended development needs fresh explicit authorization from the owner.

Historical controller code, task/progress files, branches and run logs are retained for audit, not as an active development queue. The ordinary CI, UI preview, read-only production smoke and Dokploy deployment flow are unchanged. No application functionality or production data is removed by this shutdown.

See docs/AUTOMATION.md for the shutdown record. Future development is performed only in explicitly requested sessions, not on a timer.

## Validation and privacy boundaries

CI runs build, formatting/lint, TypeScript, Pint, PHPStan and PHPUnit against SQLite and PostgreSQL 16. The public browser workflow tests search/filter recovery, intended login, Topic -> Method creation, Experience create/update/delete, copy links, own-method restrictions, public persistence, horizontal overflow and runtime errors. Internal screenshots are for review, not ZIP deliverables to the owner.

The browser test is hard-coded to localhost and uses disposable synthetic data; never point it at production. Live smoke checks are read-only and sample topic/experience pages only if existing real content is available. Zero sampled pages is not coverage of those flows. Real Google OAuth with an actual account is not exercised by the synthetic browser test; the existing backend Google tests remain.

Fortify/Socialite authentication is unchanged. The User model does not enforce verification merely because routes mention verified middleware. Secrets and production environment values stay out of Git. No generated Wayfinder files, artificial reputation, seeded production contributions or generic admin suite are introduced.

## Infrastructure and access

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`.

Cloudflare terminates HTTPS. Dokploy provides PostgreSQL. The entrypoint runs migrations and optimization; `/up` is the health check. The Experiences migration is additive and uses cascading foreign keys.

Chromium and service-identified HTTP requests have opened workbine.com with HTTP 200. A prior bare Python probe returned HTTP 403; this does not identify a specific Cloudflare rule or demonstrate an outage. No Cloudflare security configuration was changed. Check actual workflow conclusions, browser output and Dokploy state rather than inferring deployment from a merge or CI alone.

## Community design and member profile implementation

Branch: `feat/community-design-and-profiles`. This requested session implements a cleaner shared design, a public member profile, public introduction fields and a branded private account/authentication experience. See `docs/SCREENS.md` for the exact screen scope and `docs/DESIGN.md` for the refinement and attributed Dribbble references.

The migration only adds nullable bio/location/website fields to users; existing rows, authentication behavior and production content are unchanged. All public member data is explicitly serialized. No runtime dependencies, uploads, artificial community activity, scheduled coding agent or cron are introduced.

Validation is in progress. Use the latest PR head CI and browser result, not this implementation note, as proof of success. Do not merge the temporary source-audit or formatting-preparation workflows.
