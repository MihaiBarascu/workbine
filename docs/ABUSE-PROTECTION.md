# Registration and request protection

Workbine uses Cloudflare Turnstile on email registration, verified email for
contributions, and Laravel's native request limits. Google login, password
recovery, reading and publishing do not display Turnstile. Existing duplicate
email and recovery messages remain useful and explicit.

## Turnstile setup

Create a **Managed** widget on Cloudflare's free Turnstile plan for the public
application hostname. Leave pre-clearance disabled. Use the regular widget setup;
the Laravel registration action calls Siteverify directly, with no separate Worker.

Set these variables in the deployment's private environment:

```dotenv
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=your-public-site-key
TURNSTILE_SECRET_KEY=your-private-secret-key
```

Keep `APP_URL` set to the canonical public URL. Laravel checks the verification
result's hostname against that URL and requires the `register` action. The public
site key is provided only to the registration page; the secret stays on the server.
Do not commit actual deployment keys or environment values.

The widget clears expired tokens, supports retry after loading or challenge
errors, and refreshes after form submissions. Name, email and password inputs
stay in the current form after validation errors. Narrow forms use the compact
widget to avoid horizontal scrolling. Missing, oversized, rejected, expired or
reused tokens cannot create accounts or send registration email. If verification
is unavailable, the form shows a retry message; it does not silently bypass it.

Fresh installations default to `TURNSTILE_ENABLED=false`. Configure both keys
before enabling. An intentional disable restores ordinary registration while
retaining Laravel limits. Save environment changes before the normal application
deployment so Laravel's configuration cache uses them.

## Request limits

- Email registration: 10 attempts per minute per visitor IP.
- Password reset email requests: 10 attempts per minute per visitor IP across
  addresses, in addition to the existing password broker's per-address cooldown.
- Existing login, two-factor, passkey, email-confirmation resend, contribution and
  upload limits remain in place.

These are separate limits, so recovery requests do not consume registration
attempts. JSON clients receive HTTP 429 and `Retry-After`; browser forms receive
an inline error with the wait time and preserve their fields. Production must
use a persistent cache store, such as the existing database store.

Visitor identification uses Laravel's trusted-proxy handling. See [HTTPS.md](HTTPS.md)
for the forwarding requirements. The code never trusts every proxy or accepts
`CF-Connecting-IP` as a substitute for a verified proxy chain. Synthetic proxy
tests do not establish a deployment's actual forwarding configuration.

Cloudflare's standard free edge protection complements these application checks.
This release does not add WAF rules, enable Bot Fight Mode, or establish which
edge features are active in an account.

## Verification

Run `bash tools/test-local.sh` as described in [TESTING.md](TESTING.md).
PHP tests fake Siteverify to cover success, failures, malformed responses,
hostname/action mismatch and unavailable service without real keys. Browser tests
use a separate test-only development-server router to stub Siteverify; no bypass
exists in the production entry point. They exercise load failure, expiry, retries,
field preservation and successful registration through the actual Laravel form.
The widget visual check loads Cloudflare's public dummy site key and therefore
requires outbound access to `challenges.cloudflare.com`. Review its small-screen
and dark screenshots. Neither check proves a production widget's keys or domain
configuration; confirm those separately after deployment.

Sources: [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/),
[server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
