# Workbine

Workbine is a community-driven platform for discovering how people actually do things in practice.

A topic is a subject such as `Automating product imports for an online store`, not necessarily a question. A person can publish it together with their own method, explaining the steps, context and result, or start with just the topic to invite approaches. Both options use the same creation form. Other people can publish alternative methods, validate what they tried, show evidence, thank creators, and build reputation by helping others.

## Core idea

`Topic -> Methods -> Real experiences -> Evidence -> Reputation`

The product prioritizes practical experience, freshness, credibility, and helpfulness over simple popularity.

## Stack

Laravel 13 + React 19 + Inertia 3 + TypeScript + PostgreSQL.

Production uses PostgreSQL through environment variables. Local setup and CI keep Laravel's lightweight SQLite defaults.

The application is intentionally kept as a single deployable monolith for fast product iteration. A Dockerfile and `/up` health check are included for Dokploy deployment.

## Testing

Use `bash tools/test-local.sh` for local checks, including PostgreSQL and browser flows. GitHub checks are explicitly dispatched only when working without a local runtime. See [testing instructions](docs/TESTING.md).
