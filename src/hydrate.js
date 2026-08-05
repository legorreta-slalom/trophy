import { getGames, getTournaments, saveGames, saveTournaments } from './store.js'
import { saveAccess } from './publish.js'

// Spectator bootstrap: if this browser has no data, load the published JSON.
// Never overwrites existing localStorage (the host's working state wins).
export async function hydrateFromPublished() {
  if (getGames().length || getTournaments().length) return
  const base = import.meta.env.BASE_URL
  try {
    const idxRes = await fetch(`${base}data/index.json`)
    if (!idxRes.ok) return
    const index = await idxRes.json()

    const gamesRes = await fetch(`${base}data/games.json`)
    if (gamesRes.ok) saveGames(await gamesRes.json())

    const accessRes = await fetch(`${base}data/access.json`)
    if (accessRes.ok) saveAccess(await accessRes.json())

    const tournaments = await Promise.all(
      index.map(t =>
        fetch(`${base}data/tournaments/${t.id}.json`).then(r => r.ok ? r.json() : null)
      )
    )
    saveTournaments(tournaments.filter(Boolean))
  } catch {
    // offline or nothing published — start empty
  }
}
