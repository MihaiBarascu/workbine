# Images and Cloudflare R2

Workbine accepts a profile photo and one image per experience. Uploads pass through
the authenticated Laravel application; browsers do not receive storage credentials
or permission to write directly to the bucket. Images are public contributions.
The Google avatar remains separate from the uploaded profile photo.

## Application limits

- JPEG, PNG or WebP, up to 5 MiB and 16 million pixels before decoding.
- Orientation is corrected and images are re-encoded as WebP without original
  metadata. Originals are discarded. Avatars fit 512 × 512; evidence fits
  1600 × 1600 while preserving its aspect ratio. Output must be at most 1 MiB.
- Each account can hold 50 MiB, including reserved uploads and failed deletions.
- Upload attempts are limited to 10 per hour and 30 per day per account, with
  an initial application-wide limit of 500 per day. These are conservative
  starting values in `config/media.php`, adjustable after observing real use.
- Object keys are random and never reused. PostgreSQL holds ownership, disk,
  key, actual byte size and dimensions. Rendering URLs makes no R2 requests.
- New objects are tracked before storage writes. Replacements keep the old image
  until the database update succeeds. Failed deletions remain recorded for retry.

These controls reduce upload abuse; they do not impose a cap on Cloudflare charges
or control requests to public images. R2 bills storage and operations above its
free allowances, even though internet egress is free. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Production setup

The integration ships with `MEDIA_ENABLED=false`. No bucket, billable service,
domain, alert or provider token is created by a code deployment. Keep uploads
disabled until the following configuration and real provider checks are complete.

1. In the Cloudflare account that owns `workbine.com`, create a dedicated R2
   Standard bucket named `workbine-media`. The owner created it in Eastern
   Europe (`EEUR`) on 2026-09-11; keep this bucket. The server's observed outbound
   location is Germany/Frankfurt. Placement hints are best effort, and no
   comparative latency benchmark has been run.
   See [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/).
   This bucket is exclusively
   for public image uploads, not database backups or private documents.
2. In the bucket's **Settings → Custom Domains**, connect `media.workbine.com`
   and wait for Active status. Keep **Public Development URL (`r2.dev`) disabled**.
   Use this R2 custom-domain connection, not the application Tunnel. Cloudflare's
   [public bucket guide](https://developers.cloudflare.com/r2/buckets/public-buckets/)
   documents the connection and the alternate-access bypass to avoid.
3. Create an R2 API token with **Object Read & Write**, restricted to this bucket.
   Put the Access Key ID and Secret Access Key directly in Dokploy's protected
   environment editor. Do not send them in chat or commit them. Use the S3 endpoint
   shown by Cloudflare, including its jurisdiction prefix if applicable.
   See [R2 authentication](https://developers.cloudflare.com/r2/api/tokens/).
4. Add these variables to the application environment, retaining the disabled flag:

    ```dotenv
    MEDIA_ENABLED=false
    MEDIA_DISK=r2
    R2_ACCESS_KEY_ID=<access key from the R2 token>
    R2_SECRET_ACCESS_KEY=<secret from the R2 token>
    R2_BUCKET=workbine-media
    R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
    R2_PUBLIC_URL=https://media.workbine.com
    ```

    `FILESYSTEM_DISK` remains unchanged. The R2 adapter uses region `auto`, bounded
    timeouts and retries. Public delivery is controlled on the bucket's domain;
    do not add `public-read` ACLs or call `setVisibility()`.

5. In **Billing → Billable Usage**, configure a budget alert, initially USD 5,
   with the account owner's notification address. It covers account-wide usage.
   [Budget alerts are informational](https://developers.cloudflare.com/billing/manage/budget-alerts/):
   they do not pause services or prevent charges, and delivery may lag usage.
6. Configure the media hostname's cache and security settings as described below.
   Then deploy the saved environment and run `php artisan media:check` inside the
   application container. This checks local configuration without contacting R2
   or printing secrets. It is not a provider connectivity test.
7. Enable `MEDIA_ENABLED=true` and redeploy when the account configuration is ready.
   Upload a small profile photo using an owner test account, reload its public
   profile, replace it and remove it. Confirm WebP delivery, correct dimensions,
   the expected `Cache-Control` header, and that deleted objects disappear from
   the bucket. Check repeated GETs for `CF-Cache-Status: HIT` (cache population can
   differ between locations). Exercise an experience image too. Record this live
   check separately from local tests. Disable uploads if the check fails.

## Caching and abuse response

Image objects send `Cache-Control: public, max-age=3600`. Use a Cache Rule scoped
only to `media.workbine.com` to make images eligible for caching and respect
origin cache headers. Keep browser TTL at “Respect existing headers”. Do not
apply media rules to login, settings or application pages. See [Cache Rules
settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/).

Reject query strings on the media hostname with a WAF custom rule: application
image URLs never contain one, and otherwise random query parameters can fragment
the cache. Restrict the hostname to GET/HEAD if the account's existing rules allow
it. Confirm the rule works on the actual account. Review available rate limiting
and security analytics before selecting thresholds; plan availability and quotas
vary. Do not activate paid Workers, image transformation services, Cache Reserve
or additional subscriptions as part of this setup.

Public cache misses, random object paths and distributed requests can still
reach R2 and consume operations. If traffic or charges look abnormal, inspect
Cloudflare analytics and tighten the media hostname's rules. For an emergency
stop of public origin reads, disable **all** bucket public domains and keep
`r2.dev` disabled. Images will stop loading. `MEDIA_ENABLED=false` only stops new
application uploads; it does not stop public image reads or existing storage
charges. Deleting or rotating write credentials alone also does not stop public
reads.

After an image is removed, a previously cached public copy can remain available
until its TTL expires. Purge the specific URL in Cloudflare when immediate CDN
removal is necessary. Browser caches and copies already downloaded are outside
the application's control. Avoid overriding the one-hour TTL with longer edge
or browser lifetimes without reviewing this tradeoff.

## Cleanup and recovery

Normal replacement and removal attempt cleanup synchronously. To retry failed
deletions and remove unreferenced uploads older than one hour, run:

```sh
php artisan media:prune
```

The command operates from the PostgreSQL ledger rather than listing every object
in R2. It is safe to repeat; a failed delete remains recorded and returns a
nonzero command status. Schedule this command daily through Dokploy's existing
operational scheduling when enabling production uploads, and monitor failures.
The current app container has no queue worker or Laravel scheduler; deploying
this code alone does not create a scheduled cleanup job.

Keep recoverable PostgreSQL backups and arrange an independent, retained copy of
the media objects before relying on uploads for irreplaceable evidence. R2
durability is not protection from accidental deletion through valid credentials.
Back up the ledger and objects together, and test restoration into an isolated
bucket/database. Do not apply an expiry lifecycle to active `images/` objects.

## Local development and verification

For a non-production environment only, set `MEDIA_ENABLED=true`,
`MEDIA_DISK=public`, and run `php artisan storage:link`. Production intentionally
rejects this local disk: its current Docker container has no persistent upload
volume. Tests use disposable local storage and never access the R2 account.

`bash tools/test-local.sh` installs GD/EXIF and the S3 adapter, exercises application
validation and lifecycle behavior on SQLite/PostgreSQL, checks the actual SDK
request construction with mocked HTTP, and drives profile/evidence upload flows
in a local browser. Provider credentials, actual R2 permissions, domain caching,
WAF behavior, spending alerts and backups require separate operational validation.
