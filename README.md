# TROPHY

**T**racking **R**ivalries and **O**ffice **P**layoffs, **H**osted by **Y**ou

Keep track of in-office tournaments — any game, any format, any scoring system — with zero backend and zero hosting costs.

## How It Works

TROPHY runs entirely in the browser. No server. No database. No infrastructure to maintain.

| Layer | What it does |
|---|---|
| **localStorage** | Holds the active working state in your browser |
| **JSON files (GitHub)** | Persistent source of truth, version-controlled |
| **GitHub Pages** | Free, zero-config hosting |

Create a tournament, add players, run rounds, track scores. When you're done, export the state as JSON and commit it to your repo. Next session picks up right where you left off.

## Tech Stack

- **React** — UI
- **Vite** — build tool
- **localStorage + GitHub JSON** — storage
- **GitHub Pages** — hosting

## Running Locally

```bash
npm install
npm run dev
```

## Deploying

Push to `main`. The GitHub Actions workflow builds and deploys to GitHub Pages automatically.

## Data Sync

This repo IS the backend. Tournament state lives in `public/data/` and syncs automatically:

- Set a personal access token (`contents: write`) once in **Sync settings** — after that, changes batch into single commits (quiet period ~2 min, max age ~10 min, or **Sync now**). The token never leaves your browser.
- Fresh browsers hydrate from the published data automatically; **Pull latest** re-syncs on demand.
- Set an optional **Participant PIN** to let players self-report: the token ships encrypted (PBKDF2 → AES-GCM) in `data/access.json`, and the tournament's QR code (share button) deep-links phones straight to the PIN unlock.
- **Export data** still downloads the full `trophy-data.zip` as a manual fallback.

## Running Your Own

Fork this repo — your fork becomes your backend:

1. Change `REPO` in [src/repo.js](src/repo.js) to your fork
2. Enable GitHub Pages (Actions build) in your fork's settings
3. Push — the workflow deploys your instance

## Design Philosophy

TROPHY is deliberately minimal. No auth, no cloud sync, no real-time multiplayer. The office is the network.
