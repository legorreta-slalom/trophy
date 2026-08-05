import { getGames, getTournaments, saveGames, saveTournaments } from './store.js'
import { saveAccess } from './publish.js'
import { withSyncPaused } from './sync.js'
import { REPO, BRANCH } from './repo.js'

// Read from the repo directly (fresh immediately after a sync commit), falling
// back to the files bundled with the deployed site (dev server, offline CDN).
const SOURCES = [
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}/public/data/`,
  `${import.meta.env.BASE_URL}data/`,
]

async function fetchJson(file, base) {
  const res = await fetch(`${base}${file}`, { cache: 'no-store' })
  return res.ok ? res.json() : null
}

// Fetch published data and replace local state. Throws if nothing is published.
export async function pullPublished() {
  let base = null
  let index = null
  for (const source of SOURCES) {
    index = await fetchJson('index.json', source).catch(() => null)
    if (index) { base = source; break }
  }
  if (!index) throw new Error('No published data found.')

  await withSyncPaused(async () => {
    const games = await fetchJson('games.json', base)
    if (games) saveGames(games)

    const access = await fetchJson('access.json', base)
    if (access) saveAccess(access)

    const tournaments = await Promise.all(
      index.map(t => fetchJson(`tournaments/${t.id}.json`, base).catch(() => null))
    )
    saveTournaments(tournaments.filter(Boolean))
  })
}

// Spectator bootstrap: if this browser has no data, load the published JSON.
// Never overwrites existing localStorage (the host's working state wins).
export async function hydrateFromPublished() {
  if (getGames().length || getTournaments().length) return
  try {
    await pullPublished()
  } catch {
    // offline or nothing published — start empty
  }
}
