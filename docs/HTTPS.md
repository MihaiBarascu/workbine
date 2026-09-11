# HTTPS ownership and deployment

## Recommended arrangement

Cloudflare redirects HTTP visitors to HTTPS. Traefik preserves the visitor's
protocol from the tunnel. Laravel recognizes that protocol using its built-in
trusted-proxy middleware, generates HTTPS URLs and sets Secure session cookies.
There is no custom redirect middleware in Laravel.

The traffic path remains Cloudflare -> encrypted Tunnel -> Traefik HTTP ->
Laravel HTTP on port 80. Dokploy recommends routing tunnels through Traefik and
using HTTP internally, with the application's Dokploy HTTPS/certificate toggle
disabled. Do not bypass Dokploy routing or add a second TLS termination just to
fix generated URLs.

## Research and alternatives

| Approach                        | Decision                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cloudflare Always Use HTTPS     | Owns the public HTTP redirect before requests reach the application.                                          |
| Custom Laravel HTTPS redirect   | Removed: duplicates the edge responsibility and adds loop risk if proxy metadata is lost.                     |
| Force HTTPS URL generation only | Insufficient: Laravel pagination resolves its path from the Request, so the request protocol must be correct. |
| Trust every proxy with `*`      | Avoid: the current deployment has a known private infrastructure network.                                     |
| Trust a container's current IP  | Avoid as a permanent setting: container addresses can change on recreation.                                   |
| Direct tunnel-to-app routing    | Avoid here: bypasses Dokploy's domain routing without a need.                                                 |

Cloudflare explicitly notes that HTTPS redirects alone do not fix mixed content.
Correct URL generation and redirect ownership are separate concerns.

## Settings retained

- Cloudflare: enable SSL/TLS -> Edge Certificates -> Always Use HTTPS.
- Dokploy application: `APP_ENV=production`, `APP_URL=https://workbine.com`.
- Laravel: trust only `X-Forwarded-Proto`; forwarded host, port and client IP are
  not enabled by this change. Secure session cookies follow HTTPS APP_URL unless
  explicitly overridden with `SESSION_SECURE_COOKIE`.
- `TRUSTED_PROXIES` accepts comma-separated IPs/CIDRs. The existing default
  `10.0.1.0/24` matches this server's Dokploy overlay; an empty value disables
  trust for local development. This network assumption is retained for deployment
  compatibility, not a universal Dokploy default. Update it if the network changes.
- Traefik retains the verified static setting below. No further Traefik edit or
  restart is needed for this application simplification.

```yaml
entryPoints:
    web:
        address: :80
        forwardedHeaders:
            trustedIPs:
                - 10.0.1.0/24
```

This is a shared infrastructure trust boundary: containers attached to that
overlay must be trusted. Moving arbitrary workloads there or changing the subnet
requires review. The setting is in `/etc/dokploy/traefik/traefik.yml`; manage future
changes through Dokploy's supported Traefik settings, separately from app deploys.
The backup before PR #13 is `traefik.yml.before-workbine-https-20260911` beside it.
Removing proxy trust would reintroduce HTTP URLs, even with an edge redirect.

## Migration and verification

1. Enable Always Use HTTPS for the workbine.com zone. It covers other proxied
   hosts in the zone too; use a hostname-scoped Cloudflare redirect rule instead
   if those hosts need HTTP.
2. Verify the public HTTP response is the Cloudflare redirect before merging the
   application change. The old Laravel response is 308; Always Use HTTPS normally
   returns 301. Do not remove the existing redirect before its replacement works.
3. Merge tested code into `main`; let Dokploy deploy automatically. Do not invoke
   a manual deployment or restart.
4. Verify HTTPS home/feed/login return 200, pagination and Link preload URLs use
   HTTPS, session cookies have Secure, and HTTP redirects preserving path/query.
   Confirm the running container matches the merged runtime files and is healthy.
   No production content or authenticated mutation is needed.

The local PHP tests cover trusted/untrusted protocol handling, spoofed forwarded
host/port, secure cookies, lack of origin redirects, and the internal `/up` check.
They cannot prove a Cloudflare account setting; that requires a live check.

## Sources

- [Dokploy: Cloudflare Tunnels](https://docs.dokploy.com/docs/core/guides/cloudflare-tunnels)
- [Cloudflare: Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cloudflare: request protocol header](https://developers.cloudflare.com/fundamentals/reference/http-headers/#x-forwarded-proto)
- [Traefik: forwarded headers](https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/#forwarded-headers)
- [Laravel: trusted proxies](https://laravel.com/docs/13.x/requests#configuring-trusted-proxies)

The recommendation combines these documented mechanisms with the actual server
configuration and Laravel's installed PaginationState implementation, inspected
on 2026-09-11.
