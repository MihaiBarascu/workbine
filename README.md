# Workbine

Workbine is a community-driven platform for discovering how people actually do things in practice.

A topic is a subject such as `Automating product imports for an online store`, not necessarily a question. A person can publish it together with their own method, explaining the steps, context and result, or start with just the topic to invite approaches. Both options use the same creation form. Other people can publish alternative methods, report their own outcomes and share evidence. Profiles show clickable impact indicators backed by real saves and reported outcomes. A secondary reputation breakdown counts eligible support using explicit limits; thanks, voting and leaderboards are not implemented. See [docs/REPUTATION.md](docs/REPUTATION.md).

## Core idea

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

The product prioritizes practical experience, freshness, credibility, and helpfulness over simple popularity.

## Member profiles

Public profiles use `/members/{username}`. Usernames are assigned automatically and can be changed in Profile settings. Each member has one current username; previous usernames are available for reuse. Legacy numeric links redirect to the current profile.

## Stack

Laravel 13 + React 19 + Inertia 3 + TypeScript + PostgreSQL.

Production uses PostgreSQL through environment variables. Local setup and CI keep Laravel's lightweight SQLite defaults.

The application is intentionally kept as a single deployable monolith for fast product iteration. A Dockerfile and `/up` health check are included for Dokploy deployment.

## Current production handoff

Start with [docs/STATUS.md](docs/STATUS.md) for the dated production state, owner
decisions, completed releases and validation evidence.
The wider design, member usernames and image uploads are deployed. Production
runs through Docker/Dokploy; images use Cloudflare R2 and the public media domain.

The profile-photo upload/delete/upload flow, R2 cleanup and public cache
delivery were verified on 2026-09-11. Production uploads are enabled; the disabled
default in `.env.example` is for installations awaiting configuration.
See [docs/MEDIA.md](docs/MEDIA.md) for the media runbook. This repository is public;
deployment account details, internal audit results and operational follow-up are
maintained privately outside the checkout as described in [AGENTS.md](AGENTS.md).

## Testing

Use `bash tools/test-local.sh` when a usable local Docker runner is available.
Without one, explicitly request CI and UI preview by workflow dispatch or by
adding `run-remote-checks` to a same-repository PR. Ordinary pushes do not start
tests. Remove and re-add the label after changes, then verify both runs against
the current PR head and review the screenshots before merging. See
[testing instructions](docs/TESTING.md) for the full release gate.

`main` deploys automatically. The unattended coding agent remains cancelled.
The owner-authorized daily media cleanup is application maintenance and does not
enable unattended development.
