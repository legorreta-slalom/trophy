# TROPHY

**T**racking **R**ivalries and **O**ffice **P**layoffs, **H**osted by **Y**ou

A platform to keep track of in-office tournaments — any game, any format, any scoring system — with zero backend, zero hosting costs.

## What It Is

TROPHY runs entirely in the browser. No server, no database, no infrastructure. State lives in:
- **localStorage** for the active session / working state
- **JSON files in a GitHub repo** as the persistent source of truth
- **GitHub Pages** as the host

## Tech Stack

- **Framework:** React + Vite
- **UI / Design system:** Microsoft Fluent 2 — use `@fluentui/react-components` (v9). No other component library, no custom design system.
- **Backend (if ever needed):** .NET — but assume you never need it
- **Storage:** localStorage + GitHub-hosted JSON
- **Hosting:** GitHub Pages

## Coding Principles

**YAGNI** — don't build it until it's actually needed.
**KISS** — the simplest solution that works is the right one.
**DRY** — one place for each piece of logic.
**No clever tricks** — code should be obvious to a reader six months from now.
**Simplicity over abstraction** — three similar lines beat a premature helper.
**No comments that explain what** — only comments that explain *why*, when the why is non-obvious.

## Project Management

- **All tasks, backlog items, and feature requests are tracked as GitHub Issues** on [legorreta-slalom/trophy](https://github.com/legorreta-slalom/trophy/issues).
- Before starting any new feature or fix, check if an issue exists — create one if not.
- Reference the issue number in commit messages (`#123`).
- No separate task files, no Notion, no spreadsheets — GitHub Issues is the single source of truth.

## Practical Rules

- No frameworks or libraries beyond what's genuinely necessary.
- No error handling for things that can't go wrong.
- No feature flags, no backwards-compat shims.
- No generated docs or boilerplate files unless explicitly asked.
- If a component/hook/util isn't used by two or more distinct callers, keep it inline.
- Keep data shapes flat and serializable — they're going into JSON.
