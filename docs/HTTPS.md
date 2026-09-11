# HTTPS behind Dokploy and Cloudflare Tunnel

The production path is Cloudflare HTTPS -> Tunnel -> Traefik HTTP -> Laravel
HTTP on port 80. Both proxies must preserve the original visitor protocol.

Laravel trusts only `X-Forwarded-Proto` from the Dokploy overlay `10.0.1.0/24`.
Override the comma-separated `TRUSTED_PROXIES` setting if that network changes;
an empty value disables proxy trust for local development. Do not use `*`.
Forwarded host, port and client IP headers are not enabled by this HTTPS fix.

On the server, `/etc/dokploy/traefik/traefik.yml` needs this addition to the
existing `web` entry point (retain all other existing settings):

```yaml
entryPoints:
    web:
        address: :80
        forwardedHeaders:
            trustedIPs:
                - 10.0.1.0/24
```

Apply that static configuration and restart Traefik before deploying the Laravel
redirect middleware. The subnet is the internal infrastructure trust boundary;
untrusted workloads must not be attached to this overlay. This setting belongs
to Traefik's static configuration, not a generated Dokploy application router.

Use `APP_ENV=production` and `APP_URL=https://workbine.com`. HTTP application
requests receive a 308 redirect to the configured origin, preserving path,
query and request method. `/up` stays available over internal HTTP for Docker.
Local development with HTTP is unchanged. Session cookies default to Secure
when APP_URL uses HTTPS; `SESSION_SECURE_COOKIE` remains an explicit override.

Verify the public HTTPS home/feed/login return 200 without a redirect loop,
pagination and Link preload URLs use HTTPS, session cookies have Secure, and
HTTP routes redirect to HTTPS. Confirm the application container remains healthy.
Do not create production content to perform these checks.

References: [Laravel trusted proxies](https://laravel.com/docs/13.x/requests#configuring-trusted-proxies),
[Traefik forwarded headers](https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/#forwarded-headers),
[Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/#x-forwarded-proto).
