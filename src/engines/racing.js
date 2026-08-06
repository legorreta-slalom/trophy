// Racing / heats: N players per race, points by finishing position.
// A heat is { id, heat, order: [playerId, ...] } — order[0] finished first.
// Players absent from a heat score nothing for it.

export const POSITION_PRESETS = {
  linear: { label: 'Linear (heat size … 1)', table: null },
  'mario-kart': { label: 'Mario Kart', table: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  f1: { label: 'Formula 1', table: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] },
}

// table = null means linear: first gets heatSize points, last gets 1.
export const pointsForPosition = (table, position, heatSize) =>
  table ? (table[position] ?? 0) : heatSize - position

export function recordHeat(matches, order) {
  const heat = matches.length ? Math.max(...matches.map(m => m.heat)) + 1 : 1
  return [...matches, { id: crypto.randomUUID(), heat, order }]
}

export function computeStandings(players, matches, table = null) {
  const stats = Object.fromEntries(players.map(p => [p.id, { races: 0, wins: 0, pts: 0 }]))
  for (const m of matches) {
    if (m.pendingEntry) continue // unconfirmed participant reports don't score
    m.order.forEach((playerId, position) => {
      const s = stats[playerId]
      if (!s) return
      s.races++
      if (position === 0) s.wins++
      s.pts += pointsForPosition(table, position, m.order.length)
    })
  }
  return players
    .map(p => ({ ...p, ...stats[p.id] }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.name.localeCompare(b.name))
}

export const isComplete = (matches) => matches.length > 0
