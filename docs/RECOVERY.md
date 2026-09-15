# Workbine recovery exercise

This runbook documents the **procedure** for validating Workbine backups without
putting production data at risk. Deployment-specific account names, credentials,
backup locations, retention settings, contact details and dated exercise results
belong in the private operational handoff, not in this public repository.

Workbine production uses PostgreSQL and Cloudflare R2. A usable recovery plan must
cover both the relational database and the media objects referenced by it. The
application repository, database backup and R2 object backup are separate recovery
inputs.

## Safety rules

- Never test a restore over the production database or production R2 bucket.
- Use an isolated PostgreSQL instance/database and, when testing media recovery,
  a separate isolated bucket or other non-production object store.
- Do not paste production credentials, database URLs, API tokens or backup paths
  into issues, pull requests, logs or chat.
- Prefer the application release that corresponds to the backup date. Do not run
  destructive migrations merely to make an old backup fit a newer release.
- Treat restored user data as production-sensitive even in the isolated exercise.
  Restrict access and remove the temporary environment after verification.
- Disable outbound email, OAuth callbacks, scheduled jobs and other side effects in
  the isolated environment unless a specific recovery check requires them.

## Recovery facts to record privately

Before the first exercise, record these values in the private operational handoff:

- PostgreSQL backup mechanism and owner.
- Backup frequency and expected recovery point objective (RPO).
- Retention period.
- Storage location and confirmation that it does not depend on the same host as
  the primary database.
- Encryption/access-control method.
- How backup failures are detected and who receives the alert.
- R2/media backup mechanism, frequency, retention and storage location.
- The person responsible for approving a restore during a real incident.
- Target recovery time objective (RTO), if one has been chosen.

Do not mark recovery ready from a scheduled-backup screen alone. At least one
backup must be restored and validated.

## 1. Select and inspect a PostgreSQL backup

Choose a recent retained backup from the real backup system. Record its timestamp,
size and identifier privately.

If the backup process publishes checksums, verify the checksum before restoring.
Keep the original backup immutable during the exercise.

Determine the backup format before choosing the restore command. Common formats:

- PostgreSQL custom/tar/directory dump created by `pg_dump` -> restore with
  `pg_restore`.
- Plain SQL dump -> restore with `psql`.

The exact production backup command is an operational detail and should be copied
from the real backup job, not reconstructed from this document.

## 2. Create an isolated PostgreSQL target

Create a disposable PostgreSQL server or database that production cannot reach.
Use dedicated temporary credentials. The target should be empty.

For a custom-format dump, a typical restore shape is:

```sh
pg_restore \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --dbname="$RESTORE_DATABASE_URL" \
  /path/to/backup.dump
```

For a plain SQL dump:

```sh
psql "$RESTORE_DATABASE_URL" \
  --set=ON_ERROR_STOP=on \
  --file=/path/to/backup.sql
```

`RESTORE_DATABASE_URL` must point only to the isolated target. Verify the hostname
and database name before pressing Enter.

If the real backup intentionally includes ownership/roles or requires provider-
specific options, reproduce those requirements in the isolated environment rather
than weakening production controls.

## 3. Validate the database before starting Workbine

Use read-only inspection first. At minimum confirm that the expected application
tables exist and that the restore did not stop part way through.

Useful checks include:

```sh
psql "$RESTORE_DATABASE_URL" -c '\dt'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from users;'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from topics;'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from methods;'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from experiences;'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from content_reports;'
psql "$RESTORE_DATABASE_URL" -c 'select count(*) from moderation_reviews;'
```

Counts are only a sanity check. A successful exercise must also verify relations,
for example that restored methods still reference valid topics and restored
experiences still reference valid methods/users according to the application's
schema.

Do not publish row counts or restored user information in public CI logs.

## 4. Start an isolated Workbine instance

Deploy a disposable Workbine instance using the release appropriate for the
selected backup and point only its database configuration at the restored target.
Use safe non-production values for the rest of the environment.

At minimum:

- `APP_ENV` must not be `production` unless the isolated platform specifically
  requires production-mode behavior for the exercise.
- Use a non-production `APP_URL`.
- Keep outbound mail disabled or routed to a safe test sink.
- Keep OAuth credentials/callbacks disabled unless intentionally testing them.
- Do not reuse production scheduler/worker destinations.
- Do not point media writes at the production R2 bucket.

Before changing schema state, inspect it with:

```sh
php artisan migrate:status
```

If the selected application release and backup were captured from the same schema
version, no migration should be needed merely to prove that the backup restores.
If an incident recovery would intentionally deploy a newer release, test that
upgrade path as a separate, documented step.

## 5. Application-level acceptance checks

Using the isolated application and restored database, verify read-only behavior for
at least:

- Users and account records are present.
- Topics load with their authors and classifications.
- Methods load under the correct Topics.
- Experiences load under the correct Methods and retain their outcome/status.
- Content reports and moderation reviews are present when they existed at backup
  time.
- Saved/derived relations required by the current product are internally
  consistent.
- Public pages render without database errors.

Prefer a small set of known records recorded privately before the exercise so the
check proves more than non-zero table counts.

## 6. Media / R2 recovery

A PostgreSQL restore does **not** recreate R2 objects. The database contains the
media ledger and object keys, while the objects themselves need their own retained
copy.

For the recovery exercise:

1. Restore/copy a representative media backup into an isolated bucket or safe
   non-production object store.
2. Configure the isolated Workbine instance to use that isolated media target.
3. Run `php artisan media:check` to validate local media configuration. This command
   does not prove provider connectivity by itself.
4. Check several restored media ledger entries and confirm that their corresponding
   objects are retrievable from the isolated media store.
5. Include at least one avatar/profile image and one contribution/evidence image
   when those types exist in the selected backup.
6. Confirm that restored images are valid WebP files and that application records
   still point to the expected object keys.

The real media backup must be independent enough to recover from accidental object
deletion performed with otherwise valid R2 credentials. R2 durability alone is
not a substitute for that copy.

## 7. Simulate one deleted media object

To prove that media recovery is actionable, choose a disposable test object in the
isolated environment, delete it there, and restore it from the retained media
backup. Confirm the same object key becomes retrievable again.

Do **not** perform this exercise on the production bucket.

Record privately the exact recovery mechanism used (for example independent object
copy, provider backup/export or another retained store), because the application
cannot infer or recreate deleted image bytes from PostgreSQL.

## 8. Record the exercise result

For every restore exercise, record privately:

- Exercise date and operator.
- Database backup timestamp/identifier.
- Media backup timestamp/identifier.
- Application release/commit used.
- Restore start/end timestamps.
- Whether PostgreSQL restore completed without errors.
- Whether Users, Topics, Methods, Experiences, Reports and moderation records were
  verified.
- Whether relationship checks passed.
- Whether representative R2/media objects were recovered.
- Any missing data, manual steps or undocumented credentials discovered.
- Measured recovery time and whether it meets the chosen RTO.
- Follow-up actions and owner.

A restore exercise is **green** only when the application can start against the
restored database and the required database/media checks pass without improvising
critical steps.

## 9. Cleanup

After evidence has been recorded:

- Delete the disposable Workbine environment.
- Delete the isolated PostgreSQL database/server.
- Delete the isolated media bucket/copies when no longer required.
- Revoke temporary credentials.
- Confirm no production secret was committed or left in logs.

## Incident shorthand

During a real incident, the order is:

1. Stop the source of ongoing data loss if necessary.
2. Preserve current evidence/logs and avoid overwriting recoverable backups.
3. Select the recovery point approved by the responsible operator.
4. Restore PostgreSQL into a clean target.
5. Restore/verify media objects against the corresponding retained copy.
6. Start Workbine against the recovered targets.
7. Run the acceptance checks above.
8. Re-enable public traffic and side effects only after validation.
9. Document the incident, actual data loss window and follow-up actions privately.

This document is intentionally provider-light. The private handoff must contain the
real backup product/location, retention settings, access path and escalation owner
so an incident does not depend on discovering those details under pressure.
