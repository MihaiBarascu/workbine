# Workbine AI Development Guide

Read this file together with `README.md` and `docs/STATUS.md` before changing the project.

## Product direction

Workbine is a community product for practical knowledge: people share topics and the methods that actually worked for them.

Core model:

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

The product should feel like getting useful advice from a practical friend, not like reading SEO content or using a generic admin dashboard.

## Product principles

- Keep the product simple and useful before adding complexity.
- Prefer real human experience, context, evidence and freshness over popularity.
- Do not create parent/child topic hierarchies.
- A Topic is an independent subject, not necessarily a question. People can publish it with their own first method or without one to invite approaches. Treat both starting points equally.
- A Method is a concrete approach that worked for someone or is clearly attributed to another source.
- Avoid building admin panels until repeated operational needs justify one.
- Do not overbuild voting, reputation, moderation or recommendation systems before the core Topic -> Method flow is solid.
- UI should look like a modern community/product experience, not a Laravel starter dashboard.

## Stack

- Laravel 13
- React 19
- Inertia 3
- TypeScript
- PostgreSQL
- Tailwind / shadcn components
- Laravel Wayfinder
- Laravel Fortify authentication
- Laravel Socialite for Google login
- Docker deployment on Dokploy

Keep the application as one monolith unless there is a concrete reason to split it.

## Development workflow

- Work in feature branches.
- Run `bash tools/test-local.sh` before merging to `main` when a local Docker environment is available. Do not dispatch GitHub Actions from this machine.
- Use manually dispatched GitHub checks only for GPT Web sessions without a local test environment; see docs/TESTING.md.
- `main` is the production branch.
- Dokploy builds and deploys from `main`.
- Never commit secrets or production `.env` values.
- Generated Wayfinder routes/actions are not committed; generate them before frontend checks/builds.
- Keep migrations safe for an already deployed PostgreSQL database.

## Choose the test environment before working

- If you can execute commands with a usable local Docker/Compose runtime, run `bash tools/test-local.sh` in the checkout. This includes this server at `/data/srv/workbine` and other capable development environments. Do not also dispatch GitHub Actions for the same work.
- If you are in GPT Web or another session without an execution environment, explicitly dispatch `ci.yml` and `ui-preview.yml` for the feature branch. Use a connected workflow-dispatch tool/API if available, or ask the user to run them in GitHub Actions. Do not create temporary push-triggered workflows to work around a missing tool.
- A failed local test is a problem to fix locally, not a reason to start remote tests. If the local runtime cannot be made available, explain the blocker before using the remote fallback.
- Read [docs/TESTING.md](docs/TESTING.md) for commands, branch selection, result verification and handoff requirements. This policy takes precedence over historical release notes mentioning mandatory GitHub head checks.
- A push/PR never proves tests ran. Record the source revision, actual checks and outcomes. Retest changed code before merging; never claim an unexecuted check passed.

## Quality checks

Before merging meaningful changes, verify:

- frontend build
- frontend formatting/lint
- TypeScript
- PHP formatting
- PHPStan
- PHPUnit/Pest test suite

Use the local test runner as the normal release gate. GitHub workflows provide the equivalent checks only on explicit dispatch when no local environment is available.

## Production

Production domain: `https://workbine.com`

Traffic currently goes through Cloudflare Tunnel to Dokploy/Traefik and then to the Laravel container. The application container listens on port 80. Cloudflare terminates public HTTPS for the tunneled domain.

Do not expose or commit Google OAuth secrets, APP_KEY, database credentials or tunnel credentials.
