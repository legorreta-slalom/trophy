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

## Design Philosophy

TROPHY is deliberately minimal. No auth, no cloud sync, no real-time multiplayer. The office is the network.
