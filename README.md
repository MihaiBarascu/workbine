# Workbine

Workbine is a community-driven platform for discovering how people actually do things in practice.

A person can create a goal such as `How to build a SaaS with Gemini`, publish their own method, and explain exactly how they did it. Other people can publish alternative methods, validate what they tried, show evidence, thank creators, and build reputation by helping others.

## Core idea

`Goal -> Methods -> Real experiences -> Evidence -> Current reputation`

The product prioritizes practical experience, freshness, credibility, and helpfulness over simple popularity.

## Stack

Laravel 13 + React 19 + Inertia 3 + TypeScript + PostgreSQL.

Production uses PostgreSQL through environment variables. Local setup and CI keep Laravel's lightweight SQLite defaults.

The application is intentionally kept as a single deployable monolith for fast product iteration. A Dockerfile and `/up` health check are included for Dokploy deployment.
