# Workbine Status

Last updated: 2026-09-11

## Owner direction and release process

Production is `main` -> Dokploy build/migrations -> `https://workbine.com`. The owner authorizes tested feature work and merges and does not want ZIP deliverables. Read README.md, AGENTS.md, this file, docs/DESIGN.md and docs/BACKLOG.md before changing anything.

On 2026-09-11 the owner stopped the GitHub coding agent and requested removal of its cron. PR #11 removed the scheduled workflow. This revokes the earlier request for unattended development. Do not restore the workflow, rerun old agent jobs, activate publication permissions or continue its pending branch without a new explicit request. The retained controller/task files are inactive history. Quality checks and browser tests remain required; they now run locally during sessions on this machine. Dokploy remains automatic.

The latest visual direction is white, very light neutral grey, graphite text and restrained blue actions. The owner rejected the previous green/olive/teal and terracotta treatment. The current docs/DESIGN.md supersedes historical palette instructions.

## Testing policy — local environment first

The owner requests local testing on this machine to avoid GitHub Actions usage. Run `bash tools/test-local.sh` before merging. It checks a working-tree snapshot in disposable containers, including SQLite, PostgreSQL and browser flows. No production services, databases or environment files are used. CI, UI preview and read-only production smoke now require explicit dispatch; the historical bootstrap workflow is also manual. GPT Web sessions without a local runtime can use the retained GitHub workflows. See docs/TESTING.md. This supersedes historical instructions below to require GitHub head checks for every release.

## HTTPS simplification handoff

PR #13 fixed HTTPS recognition through the proxy chain and added an application
redirect. PR #14 removed that custom redirect after Cloudflare Always Use HTTPS
was enabled and verified. The follow-up is merged and deployed; HTTP redirects
at Cloudflare, while Laravel continues to recognize HTTPS through trusted proxies. See docs/HTTPS.md for research, the migration gate and remaining
infrastructure assumptions.

Work locally in `/data/srv/workbine`. A merge/push to `main` automatically triggers
Dokploy; observe the deployment instead of invoking another deploy or restarting
containers. Infrastructure changes require a separate concrete explanation and
explicit authorization, preferably through Dokploy's UI/API.

## Wider community design - 2026-09-11

The owner requested a more spacious, natural community interface. Branch
`feat/open-community-layout` replaces the three-column discovery layout with a
1600px shell, a wide contribution column, inline filters, compact search and a
quieter supporting guide. The feed measures 1040px at a 1440px viewport, up from
744px. Topic and experience pages share the wider alignment with readable body
widths, real author avatars and a linked index of existing methods. Navigation
and member/account page spacing are aligned with the new layout. The neutral
light/blue palette, dark preference, topic draft and first-method flow remain.
No backend, database, dependency or infrastructure changes are part of this work.

Application revision `8d13879` passed `bash tools/test-local.sh` with a clean
working tree: production frontend build, formatting/lint, TypeScript, Pint,
PHPStan, 115 application tests on each of SQLite and PostgreSQL, 13 Python tests,
25 public responsive captures and the contribution/profile/authentication browser
flows. Logs and screenshots: `/tmp/workbine-local-tests.KyHwKt/`. Desktop, mobile,
method and search-empty captures were visually reviewed. Mobile placeholder text
was subsequently shortened after review; use the final PR validation record for
checks on that revision. No GitHub Actions were dispatched.

The expanded capture matrix covers feed widths 320 through 1920px in light/dark,
search results and empty results, link navigation and keyboard focus. Preview
content is synthetic and stays in disposable local containers. Production had no
public topics during the initial read-only check; design validation does not
claim audience growth. Merge and live deployment must be confirmed separately.

## Product capabilities

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`.

Topics are independent subjects, not necessarily questions. The creation form offers an optional first method (title, steps/context/result, source link). Topic and method are validated together and saved in one transaction; topic-only creation remains available. Homepage, authentication and contribution copy present sharing and exploration as equal starting points. Bounded literal search across title/context combines with Needs a method and stable pagination. Users share concrete methods and report positive, partial or negative experiences with context, optional trial date and public evidence URL. A unique user/method key, atomic updates, own-entry removal, scoped routes, no author self-validation and contribution throttling are in place. Outcomes are self-reported, not independent verification or measured success rates.

PRs #5-#7 added public discovery, experiences/search and production smoke checks. PR #8 introduced the previous notebook UI; its protected topic draft flow remains. Prompts are labelled as prompts, not fake community content. Link copying includes a manual fallback.

## Community design and member profiles

PR #12, branch `feat/community-design-and-profiles`. Check the PR merge state and latest head checks before continuing. A checkout or successful merge is not proof of production deployment.

- Unified neutral light/blue theme and neutral dark appearance, shared by public pages, authentication, account settings, dropdowns and dialogs.
- Public `/members/{id}` profile with introduction, location, personal website, join month, real counts and paginated Methods / Topics / Experiences. Author links lead to member profiles.
- Private Profile settings distinguish public introduction fields from private email. Security and Appearance no longer use the Laravel starter sidebar.
- Branded login, registration, forgot/reset password, email verification, password confirmation, two-factor and recovery-code screens preserve existing authentication behavior.
- Own profile action, account dropdown, POST logout and existing confirmation dialogs remain functional. Sign-in alternatives share one email separator; the redundant separator found during visual review was removed.
- Workbine SVG/ICO/mobile bookmark icons replace the Laravel favicon.

The migration adds only nullable bio/location/website columns to users. No existing rows or authentication policy are rewritten. Public data is serialized explicitly; private email, Google identity and security data are omitted. Website input permits only HTTP/HTTPS, and bio is escaped by React. No uploads, new runtime dependencies, fake activity or new scheduled agent.

## Validation handoff

Application revision `9a8eddb6ad4f990a336e229f0cad8af1bbab2df1` passed CI #40 (run `34577150367`) and Public UI preview #20 (run `34577150392`). The full SQLite/PostgreSQL pipeline passed build, formatting/lint, TypeScript, Pint, PHPStan, 93 application tests and 13 existing Python guard/parser tests. Eight new application tests cover member privacy, contribution ownership, tabs/pagination, input validation and missing users.

The original Topic -> Method -> Experience browser flow and the added profile/account/authentication flow both passed. These check profile persistence, public privacy, escaped bio, long names, narrow-screen overflow, theme persistence, account-menu logout, clipboard-denied fallback, registration, password confirmation and two-factor recovery. Palette assertions check the actual computed neutral canvas and blue primary colors.

Desktop feed, public member profile, private settings and authentication screens were visually inspected, together with mobile and dark states across the 37-image preview set. Full-page captures of scrolled pages can include the sticky header at its current scroll position; that is not evidence that the header is duplicated in the application. The two-factor setup capture covers the dialog/loading layout, not a complete authenticator enrollment. See docs/SCREENS.md for scope and limitations.

An initial CI failure identified Markdown formatting in DESIGN.md; it was fixed without disabling the check. Temporary source-review and formatting-preparation workflows are absent from the release diff. They only applied manually authored changes during this requested session and did not invoke a coding agent.

Use fresh local results for the exact changes being merged as the release gate; use dispatched GitHub checks only when no local runtime is available. Confirm live rendering separately after Dokploy completes the merge-triggered build. Screenshots are internal review evidence, not ZIP deliverables.

## Stack, privacy and operational boundaries

Keep the Laravel 13 + React 19 + Inertia 3 + TypeScript monolith. Production uses PostgreSQL; CI tests SQLite and PostgreSQL 16. Generate Wayfinder files before build/type checks, never commit them. Fortify and Socialite behavior is unchanged. Routes mentioning verified middleware do not make the User model enforce verification by themselves.

Browser mutation tests are intentionally hard-coded to localhost with synthetic data. Never run them against production. Real Google OAuth and device-specific hardware passkey enrollment require actual provider/device interaction and are not claimed covered by synthetic browser tests. Existing backend security tests remain. Standard framework error responses are outside this screen refinement.

`Cloudflare -> Cloudflare Tunnel -> Dokploy Traefik -> Laravel container:80`. Cloudflare terminates HTTPS; Dokploy provides PostgreSQL. The entrypoint runs migrations and optimization; `/up` is the health check. Secrets, production environment values and real customer data must remain out of Git.

Read-only live smoke verifies health/search/listing and samples existing topic/experience pages when content exists; zero sampled pages is not coverage of those flows. It parses initial Inertia HTML, avoiding an unversioned XHR asset-mismatch response. A failed local web/DNS fetch does not prove an outage or identify a Cloudflare rule. CI/merge success alone is not deployment proof.
