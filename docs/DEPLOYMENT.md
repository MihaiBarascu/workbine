# Workbine deployment

Workbine uses a build-once release flow. GitHub Actions builds one immutable arm64
image per `main` commit, staging runs that exact image first, and production is
promoted to the same image only after the owner approves it. The server never
builds from source.

```text
push to main
  -> Release / publish      build ghcr.io/mihaibarascu/workbine:<sha> once and verify it
  -> Release / staging      point :staging at <sha>, redeploy staging, verify the served revision
  -> Release / production   wait for approval, point :production at <sha>, redeploy, verify
```

## Release workflow

`.github/workflows/release.yml` runs on every push to `main` and can be dispatched
manually. Pushes that only change documentation (`docs/` or Markdown files) are
skipped: they change nothing that runs, so they need no image or approval.

The **publish** job:

- builds the Dockerfile once for `linux/arm64` on a native ARM runner, matching the
  Dokploy host architecture;
- bakes the commit into the image as `WORKBINE_REVISION`;
- publishes `ghcr.io/mihaibarascu/workbine:<git-sha>` and the convenience tag `:main`;
- pulls the exact digest back and verifies PHP, Node, the SSR bundle, Supervisor,
  Laravel, Inertia SSR and the revision reported by `/up`.

The **staging** and **production** jobs call `.github/workflows/deploy.yml`, which:

1. resolves the digest of `:<sha>` and fails unless that image's revision label is
   the requested commit; production reuses the digest staging verified instead of
   reading the tag again;
2. extracts the image's Vite manifest as the expected frontend build;
3. moves the environment tag (`:staging` or `:production`) to that digest;
4. calls the environment's Dokploy deploy webhook, so Dokploy pulls the tag and
   updates the service;
5. runs `tools/release_smoke.py` until `/up` reports `X-Workbine-Revision: <sha>` and
   the read-only public checks pass, for up to ten minutes.

The SHA tag or digest is the release identifier. `:staging` and `:production` only
record what each environment runs; never point an environment at `:main` or `latest`.

Every third-party action in the workflows is pinned to a full commit SHA, with its
version in a trailing comment. Update a pin deliberately after reviewing the
release instead of switching back to a moving tag.

Inside the image, Supervisor starts Apache and the Inertia SSR server. Apache
workers and the SSR process run as `www-data`, not root.

## Approval

The `production` GitHub environment requires the owner's approval. After staging
passes, the run waits on its production job: review staging, then approve or reject
it from the run page in GitHub Actions (or the GitHub mobile app). Rejecting or
ignoring a run leaves production on its current revision; staging keeps the newer
one. Only one deployment per environment runs at a time.

## Redeploy and rollback

Run **Release** manually on `main` with `revision` set to an earlier published
commit SHA. The build is skipped; that image is redeployed to staging and, after
approval, to production. It takes about a minute per environment because nothing is
rebuilt.

A container rollback does not reverse database migrations. The entrypoint migrates
on every start, and Dokploy starts the new container before stopping the old one,
so every migration must stay compatible with the previous release (expand first,
remove columns in a later release).

Do not change the image field in Dokploy to roll back. The next release would move
the environment tag while Dokploy kept deploying the manually entered image; the
release check would then fail on the revision mismatch.

## Environments

The Dokploy project has separate `production` and `staging` environments, each with
its own application and PostgreSQL 18 service. Both applications use the Docker
source `ghcr.io/mihaibarascu/workbine:<environment>` without registry credentials;
the GHCR package is public. Automatic deployment stays enabled on both applications
because the webhook requires it. Neither application uses a Git provider, which
would rebuild from source on the server.

Cloudflare terminates TLS. The tunnel routes both hostnames to Traefik over HTTP;
the Dokploy domains use container port `80` with HTTPS disabled. See
[HTTPS.md](HTTPS.md).

### Staging

- `https://staging.workbine.com` is protected by Cloudflare Access and open only to
  the owner. Release checks authenticate with an Access service token.
- Staging runs the production configuration (`APP_ENV=production`, the same email,
  Google, Turnstile and moderation integrations), so a release is exercised the way
  production runs it.
- It never shares state with production: it has its own PostgreSQL service,
  `APP_KEY`, R2 bucket and public media hostname. Its R2 token can only reach the
  staging bucket.
- Google sign-in uses the production OAuth client with the staging callback URL
  registered.
- Do not copy production data into staging. Its email integration is real, so a
  copied member list could receive staging mail.
- CPU and memory are capped so staging cannot starve production on the shared host.

### Logs

Both applications set `LOG_CHANNEL=stderr`. Laravel errors then appear in Dokploy's
container logs next to Apache and SSR output, and they survive redeploys in the
Docker log instead of disappearing with the container's filesystem.

## One-time configuration

GitHub environments:

| Environment  | Protection                                   | Secrets                                                                 |
| ------------ | -------------------------------------------- | ----------------------------------------------------------------------- |
| `staging`    | deployments only from `main`                 | `DOKPLOY_DEPLOY_HOOK`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` |
| `production` | owner approval; deployments only from `main` | `DOKPLOY_DEPLOY_HOOK`                                                   |

`DOKPLOY_DEPLOY_HOOK` is the application's webhook URL from Dokploy's Deployments
tab. It can only redeploy that one application, so GitHub never holds a Dokploy API
key. Rotate it with Dokploy's refresh-token action if it leaks, then update the
secret. Set secrets with `gh secret set NAME --env ENVIRONMENT`, which prompts for
the value instead of placing it in shell history.

Deployment-specific identifiers, Cloudflare account settings, backup destinations
and credentials belong in the private operational handoff described in
[AGENTS.md](../AGENTS.md), not in this repository.

## Deployment verification

`tools/release_smoke.py` never creates content. For each environment it checks:

1. `/up` returns HTTP 200 and the expected `X-Workbine-Revision`;
2. the public Vite manifest matches the image's build (the application entry asset
   is the fallback when the manifest is not public);
3. the homepage is server-rendered and does not expose PHP in `X-Powered-By`;
4. the sitemap parses and lists URLs for that environment;
5. search, the topic listing and a sample topic, method, experience and member page
   load.

A passing check proves which image serves traffic and that it renders. It does not
prove runtime environment values or external providers; an empty staging database
also means the sampled detail pages are skipped.

`production-smoke.yml` remains available for a manual read-only check of production
against a source commit; it builds that commit's Dockerfile for the expected
frontend and runs the same script.

## Backups

Production PostgreSQL is backed up daily by Dokploy to an off-host S3-compatible
destination. Restore procedure and verification rules are in
[RECOVERY.md](RECOVERY.md); schedules, retention and locations are recorded in the
private handoff.
