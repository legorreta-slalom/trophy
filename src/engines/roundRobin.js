// Circle algorithm: fix player[0], rotate the rest each round.
// Produces one match per pair, grouped into rounds so no player
// plays twice in the same round.
export function generate(players) {
  const list = [...players]
  if (list.length % 2 === 1) list.push({ id: '__bye__' })
  const half = list.length / 2
  const matches = []

  for (let round = 0; round < list.length - 1; round++) {
    for (let i = 0; i < half; i++) {
      const p1 = list[i]
      const p2 = list[list.length - 1 - i]
      if (p1.id !== '__bye__' && p2.id !== '__bye__') {
        matches.push({ id: crypto.randomUUID(), round: round + 1, player1Id: p1.id, player2Id: p2.id, result: null })
      }
    }
    // Keep list[0] fixed, rotate the rest
    const last = list.pop()
    list.splice(1, 0, last)
  }
  return matches
}

export function computeStandings(players, matches) {
  const stats = Object.fromEntries(
    players.map(p => [p.id, { played: 0, w: 0, d: 0, l: 0, pts: 0 }])
  )
  for (const m of matches) {
    if (!m.result) continue
    const p1 = stats[m.player1Id]
    const p2 = stats[m.player2Id] // undefined for Swiss byes (player2Id null)
    if (p1) p1.played++
    if (p2) p2.played++
    if (m.result.winner === 'draw') {
      if (p1) { p1.d++; p1.pts++ }
      if (p2) { p2.d++; p2.pts++ }
    } else if (m.result.winner === 'player1') {
      if (p1) { p1.w++; p1.pts += 3 }
      if (p2) p2.l++
    } else {
      if (p2) { p2.w++; p2.pts += 3 }
      if (p1) p1.l++
    }
  }
  return players
    .map(p => ({ ...p, ...stats[p.id] }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w || a.name.localeCompare(b.name))
}

export const isComplete = (matches) => matches.length > 0 && matches.every(m => m.result !== null)
