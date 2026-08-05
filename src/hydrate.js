import { getGames, getTournaments, saveGames, saveTournaments } from './store.js'
import { saveAccess } from './publish.js'

// Fetch published data and replace local state. Throws if nothing is published.
export async function pullPublished() {
  const base = import.meta.env.BASE_URL
  const idxRes = await fetch(`${base}data/index.json`, { cache: 'no-store' })
  if (!idxRes.ok) throw new Error('No published data found.')
  const index = await idxRes.json()

  const gamesRes = await fetch(`${base}data/games.json`, { cache: 'no-store' })
  if (gamesRes.ok) saveGames(await gamesRes.json())

  const accessRes = await fetch(`${base}data/access.json`, { cache: 'no-store' })
  if (accessRes.ok) saveAccess(await accessRes.json())

  const tournaments = await Promise.all(
    index.map(t =>
      fetch(`${base}data/tournaments/${t.id}.json`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
    )
  )
  saveTournaments(tournaments.filter(Boolean))
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
