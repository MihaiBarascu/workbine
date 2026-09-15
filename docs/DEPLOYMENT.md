# Workbine deployment

Workbine uses a build-once release flow: GitHub Actions publishes an immutable container image to GHCR, staging validates that exact artifact, and production is promoted to the same image only after staging passes.

## Phase 1: GHCR artifact pipeline

`.github/workflows/publish-container.yml` runs after a push to `main` and can also be dispatched manually.

The workflow:

- builds the current Workbine Dockerfile once for `linux/arm64`, matching the current Dokploy host architecture;
- publishes `ghcr.io/mihaibarascu/workbine:<git-sha>`;
- also updates the convenience tag `ghcr.io/mihaibarascu/workbine:main`;
- records the registry digest;
- pulls the image back by digest and verifies PHP, Node, the SSR bundle, Supervisor, Laravel and Inertia SSR;
- does **not** deploy production.

The SHA tag or digest is the release identifier. Do not use `latest` as the production release reference.

## Current production during Phase 1

Keep the existing Dokploy production application unchanged while the artifact pipeline is introduced and verified. Production still uses the current deployment path until staging exists and the promotion flow is ready.

## Phase 2: Dokploy staging

Create a separate `Staging` environment under the existing Workbine project. Keep staging services and credentials independent from production.

Recommended services:

- application: `workbine-staging`;
- PostgreSQL: `postgres-staging` using PostgreSQL 18;
- domain: `staging.workbine.com`;
- container source: Docker/GHCR;
- target container port: `80`.

Use an immutable image while validating a release:

```text
ghcr.io/mihaibarascu/workbine:<git-sha>
```

Do not point staging release validation at the moving `main` tag once automatic promotion is introduced.

### GHCR access from Dokploy

If the GHCR package is public, Dokploy can pull it without registry credentials.

If it remains private, configure a GHCR registry credential in Dokploy using:

- Registry URL: `ghcr.io`;
- Username: the GitHub account allowed to read the package;
- Password: a GitHub personal access token (classic) with the minimum package read permission required to pull the image.

Do not put registry credentials into the Workbine image or repository.

### Staging PostgreSQL

Create a new PostgreSQL database instead of reusing production. Suggested logical values:

```text
DB_CONNECTION=pgsql
DB_PORT=5432
DB_DATABASE=workbine_staging
DB_USERNAME=workbine_staging
```

Generate a unique strong database password in Dokploy and use the internal hostname/value exposed by the staging PostgreSQL service as `DB_HOST`.

Never point staging to the production database.

### Minimum staging application environment

Start with environment-specific values and safe integrations:

```text
APP_NAME=Workbine
APP_ENV=staging
APP_KEY=<unique staging key>
APP_DEBUG=false
APP_URL=https://staging.workbine.com

DB_CONNECTION=pgsql
DB_HOST=<staging postgres internal hostname>
DB_PORT=5432
DB_DATABASE=workbine_staging
DB_USERNAME=workbine_staging
DB_PASSWORD=<staging-only password>

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log
MEDIA_ENABLED=false
TURNSTILE_ENABLED=false
CONTENT_MODERATION_ENABLED=false
COMMUNITY_REPORTS_ENABLED=false
```

Generate a new staging `APP_KEY`; do not copy the production key.

After the basic deployment is healthy, configure separate staging credentials for R2/media, email, Turnstile and moderation where those integrations are needed by E2E tests.

## Deployment verification

The container entrypoint runs migrations and Laravel optimization before Supervisor starts the application runtime. The image health check validates `/up` and Inertia SSR.

For the first staging release verify at minimum:

1. deployment reaches healthy state;
2. migrations finish successfully against `postgres-staging`;
3. `/up` returns success through the staging domain;
4. SSR is active;
5. static frontend assets load;
6. no production database, storage bucket or external secrets are referenced.

## Production promotion

Production migration to GHCR is a later phase. When it is enabled, production must use the same SHA tag or digest already validated in staging. Do not rebuild from source during promotion.

Rollback is performed by selecting a previously known-good SHA tag or digest. A container rollback does not automatically reverse database migrations, so schema changes must remain compatible with the rollback strategy.
