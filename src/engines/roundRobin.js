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

export const DEFAULT_POINTS = { win: 3, draw: 1, loss: 0 }

export function computeStandings(players, matches, points = DEFAULT_POINTS) {
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
      if (p1) { p1.d++; p1.pts += points.draw }
      if (p2) { p2.d++; p2.pts += points.draw }
    } else if (m.result.winner === 'player1') {
      if (p1) { p1.w++; p1.pts += points.win }
      if (p2) { p2.l++; p2.pts += points.loss }
    } else {
      if (p2) { p2.w++; p2.pts += points.win }
      if (p1) { p1.l++; p1.pts += points.loss }
    }
  }
  const rows = players.map(p => ({ ...p, ...stats[p.id] }))

  // Head-to-head tiebreak: within each points-tie group, rank by points
  // earned in matches among the tied players only.
  const groups = new Map()
  for (const r of rows) {
    if (!groups.has(r.pts)) groups.set(r.pts, [])
    groups.get(r.pts).push(r)
  }
  const h2h = new Map(rows.map(r => [r.id, 0]))
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const ids = new Set(group.map(r => r.id))
    for (const m of matches) {
      if (!m.result || !ids.has(m.player1Id) || !ids.has(m.player2Id)) continue
      if (m.result.winner === 'draw') {
        h2h.set(m.player1Id, h2h.get(m.player1Id) + points.draw)
        h2h.set(m.player2Id, h2h.get(m.player2Id) + points.draw)
      } else if (m.result.winner === 'player1') {
        h2h.set(m.player1Id, h2h.get(m.player1Id) + points.win)
      } else {
        h2h.set(m.player2Id, h2h.get(m.player2Id) + points.win)
      }
    }
  }

  return rows.sort((a, b) =>
    b.pts - a.pts || h2h.get(b.id) - h2h.get(a.id) || b.w - a.w || a.name.localeCompare(b.name)
  )
}

export const isComplete = (matches) => matches.length > 0 && matches.every(m => m.result !== null)
