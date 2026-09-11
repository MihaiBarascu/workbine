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
- Run CI before merging to `main`.
- `main` is the production branch.
- Dokploy builds and deploys from `main`.
- Never commit secrets or production `.env` values.
- Generated Wayfinder routes/actions are not committed; generate them before frontend checks/builds.
- Keep migrations safe for an already deployed PostgreSQL database.

## Quality checks

Before merging meaningful changes, verify:

- frontend build
- frontend formatting/lint
- TypeScript
- PHP formatting
- PHPStan
- PHPUnit/Pest test suite

Use the repository CI workflow as the source of truth.

## Production

Production domain: `https://workbine.com`

Traffic currently goes through Cloudflare Tunnel to Dokploy/Traefik and then to the Laravel container. The application container listens on port 80. Cloudflare terminates public HTTPS for the tunneled domain.

Do not expose or commit Google OAuth secrets, APP_KEY, database credentials or tunnel credentials.
