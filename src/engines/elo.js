// Elo ratings across tournaments (#52). Players matched by name
// (case-insensitive) since rosters are per-tournament. K=32, start 1000.
// Recomputed from history on render — no stored derived state.
const K = 32
const START = 1000

const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400))

// Returns Map(lowercase name → { name, rating, games })
export function computeElo(tournaments, gameId = null) {
  const ratings = new Map()
  const get = (name) => {
    const key = name.trim().toLowerCase()
    if (!ratings.has(key)) ratings.set(key, { name: name.trim(), rating: START, games: 0 })
    return ratings.get(key)
  }

  const eligible = tournaments
    .filter(t => (!gameId || t.gameId === gameId) && t.players?.length && t.matches?.length)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))

  for (const t of eligible) {
    const nameOf = (id) => t.players.find(p => p.id === id)?.name
    for (const m of t.matches) {
      if (!m.result || m.pendingEntry || m.order) continue // unplayed, unconfirmed, or racing heat
      const n1 = nameOf(m.player1Id)
      const n2 = nameOf(m.player2Id)
      if (!n1 || !n2) continue // byes
      const score1 =
        m.result.winner === 'draw' ? 0.5
        : m.result.winner === 'player1' || m.result.winnerId === m.player1Id ? 1
        : 0
      const r1 = get(n1)
      const r2 = get(n2)
      const e1 = expected(r1.rating, r2.rating)
      r1.rating += K * (score1 - e1)
      r2.rating += K * ((1 - score1) - (1 - e1))
      r1.games++
      r2.games++
    }
  }
  return ratings
}

export const eloFor = (ratings, name) => ratings.get(name.trim().toLowerCase()) ?? null
