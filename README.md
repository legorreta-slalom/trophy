# TROPHY

**T**racking **R**ivalries and **O**ffice **P**layoffs, **H**osted by **Y**ou

Run in-office tournaments — any game, any format, any scoring system — with zero backend and zero hosting costs. The GitHub repo you're looking at *is* the database.

## Features

**Eight tournament formats**

| Format | What it is |
|---|---|
| Round Robin | Everyone plays everyone; standings by points |
| Single Elimination | Classic bracket, byes auto-advance, seeded so 1 and 2 meet in the final |
| Double Elimination | Winners + losers brackets, grand final with bracket reset |
| Swiss | Paired by standings each round, no rematches, no elimination |
| Leaderboard / Open | No schedule — record any result any time (office ladder) |
| Racing / Heats | Tap racers in finishing order; Mario Kart / F1 / custom points tables |
| Group + Knockout | World Cup style: group round robins → cross-seeded bracket |
| Season + Playoffs / Conference + Finals | NFL/NBA style multi-phase leagues |

**Running a tournament**
- One-click result entry, optional scores (21–19, winner inferred), best-of-3/5 series in brackets
- Result corrections with cascade-clearing in brackets; reopen finished tournaments
- Custom win/draw/loss points per tournament; head-to-head tiebreakers
- Match scheduling with a **Today** agenda and subscribable **.ics calendars**
- Streaming/watch links on tournaments and matches; per-match comment threads
- Teams as participants (rosters, logos); player avatars and tournament covers with initials fallback

**The office layer**
- **Hall of Fame** — championships, appearances, and live **Elo ratings** per game
- **Player profiles** — all-time record, head-to-head vs every colleague, recent form
- **Kiosk mode** (`/kiosk`) — chromeless rotating dashboard for the office TV
- **Activity feed** — the repo's commit history as an in-app timeline
- Dark mode (follows the OS), mobile layout, QR codes for phone-based reporting

## How It Works

TROPHY runs entirely in the browser. No server. No database. No infrastructure to maintain.

| Layer | What it does |
|---|---|
| **localStorage** | The working state in your browser (a write-through cache) |
| **This repo** | Source of truth: JSON under `public/data/`, synced by batched commits |
| **GitHub Pages** | Free hosting; fresh browsers hydrate from the published data |

## Data Sync

- The **host** sets a personal access token (`contents: write` on this repo) once in **Sync settings**. After that, changes batch into single commits automatically (~2 min quiet period, 10 min cap, or **Sync now**). The token never leaves the browser.
- **Participants** self-report from their phones: scan the tournament's QR code, enter the **PIN** the host set, and report results — which land as *pending* until the host confirms. Under the hood the PIN decrypts the host's token (PBKDF2 → AES-GCM), shipped in `data/access.json`.
- **Spectators** need nothing: anyone with the URL sees everything, read-only.
- Concurrent writers are safe: conflicting syncs rebuild on the new head and retry.
- **Pull latest** re-syncs a browser on demand; **Export data** downloads the full ZIP as a manual fallback.

## Running Locally

```bash
npm install
npm run dev     # dev server
npm test        # engine + sync test suite
npm run lint    # oxlint
```

## Deploying

Push to `main` — the workflow lints, tests, builds, and deploys to GitHub Pages. Data-only sync commits skip the rebuild (the app reads data from raw.githubusercontent, not the bundle).

## Running Your Own

Fork this repo — your fork becomes your backend:

1. Change `REPO` in [src/repo.js](src/repo.js) to your fork
2. Enable GitHub Pages (source: GitHub Actions) in your fork's settings
3. Push — the workflow deploys your instance

## Design Philosophy

YAGNI, KISS, DRY. Flat serializable data, no derived state stored, no clever tricks. The office is the network.
