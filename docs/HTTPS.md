# HTTPS ownership and deployment

## Current arrangement

Cloudflare redirects HTTP visitors to HTTPS. Traefik preserves the visitor's
protocol from the tunnel. Laravel recognizes that protocol using its built-in
trusted-proxy middleware, generates HTTPS URLs and sets Secure session cookies.
There is no custom redirect middleware in Laravel.

The traffic path is Cloudflare -> encrypted Tunnel -> Traefik HTTP -> Laravel
HTTP on port 80. Dokploy recommends routing tunnels through Traefik and using
HTTP internally, with the application's Dokploy HTTPS/certificate toggle
disabled. Do not bypass Dokploy routing or add a second TLS termination just to
fix generated URLs.

## Decisions and alternatives

| Approach                        | Decision                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cloudflare Always Use HTTPS     | Owns the public HTTP redirect before requests reach the application.                                          |
| Custom Laravel HTTPS redirect   | Removed: duplicates the edge responsibility and adds loop risk if proxy metadata is lost.                     |
| Force HTTPS URL generation only | Insufficient: Laravel pagination resolves its path from the Request, so the request protocol must be correct. |
| Trust every proxy with `*`      | Avoid: trust should be limited to the application's actual infrastructure network.                            |
| Trust a container's current IP  | Avoid as a permanent setting: container addresses can change on recreation.                                   |
| Direct tunnel-to-app routing    | Avoid here: bypasses Dokploy's domain routing without a need.                                                 |

Cloudflare explicitly notes that HTTPS redirects alone do not fix mixed content.
Correct URL generation and redirect ownership are separate concerns.

## Configuration responsibilities

- Cloudflare owns SSL/TLS -> Edge Certificates -> Always Use HTTPS.
- Dokploy supplies `APP_ENV=production` and the public HTTPS `APP_URL`.
- Laravel trusts only `X-Forwarded-Proto`; forwarded host, port and client IP are
  not enabled by this change. Secure session cookies follow the HTTPS `APP_URL`
  unless explicitly overridden with `SESSION_SECURE_COOKIE`.
- `TRUSTED_PROXIES` accepts comma-separated IPs/CIDRs. Configure it for the actual
  infrastructure network; an empty value disables trust for local development.
  A deployment-specific network must not be treated as a universal Dokploy default.
- Traefik's HTTP entrypoint must trust forwarded headers only from the intended
  upstream network. Manage changes through Dokploy's supported Traefik settings,
  separately from application deploys.

Proxy trust is a shared infrastructure boundary: attached containers must be
trusted. Changing that network or attaching additional workloads requires review.
Removing proxy trust would reintroduce HTTP URLs, even with an edge redirect.
Concrete network values, host configuration locations and recovery details belong
in the private operational handoff, outside this public repository.

## Release history and verification

PR #13 corrected HTTPS recognition through the proxy chain and added an
application redirect. PR #14 removed that redirect after Cloudflare Always Use
HTTPS was enabled and verified. Both changes were merged and deployed on
2026-09-11. This migration is complete; do not repeat it as an outstanding task.

For a future HTTPS change:

1. Check the scope of the edge redirect. Always Use HTTPS covers other proxied
   hosts in the zone too; use a hostname-scoped Cloudflare redirect rule if those
   hosts need HTTP.
2. Verify a replacement redirect before removing the existing one. Status codes
   alone do not establish which component served the response.
3. Merge tested application code into `main` and let Dokploy deploy automatically.
   Observe that deployment instead of invoking an additional deployment or restart.
4. Verify HTTPS home/feed/login responses, HTTPS pagination and Link preload URLs,
   Secure session cookies, and HTTP redirects preserving path/query. Confirm the
   running container matches the merged runtime files and is healthy. No production
   content changes or authenticated mutations are needed for these checks.

Existing PHP tests cover trusted/untrusted protocol handling, spoofed forwarded
host/port, secure cookies, lack of origin redirects, and the internal `/up` check.
They cannot prove a Cloudflare account setting; that requires a live check.
Historical validation is evidence for that release, not a claim that a new check
has run or that infrastructure settings cannot change.

## Sources

- [Dokploy: Cloudflare Tunnels](https://docs.dokploy.com/docs/core/guides/cloudflare-tunnels)
- [Cloudflare: Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cloudflare: request protocol header](https://developers.cloudflare.com/fundamentals/reference/http-headers/#x-forwarded-proto)
- [Traefik: forwarded headers](https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/#forwarded-headers)
- [Laravel: trusted proxies](https://laravel.com/docs/13.x/requests#configuring-trusted-proxies)

The decisions combine these documented mechanisms with the deployment and
Laravel's installed PaginationState implementation reviewed for the HTTPS changes
on 2026-09-11.
