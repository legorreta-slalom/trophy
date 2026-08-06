function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

// Standard bracket order: seed 1 and 2 in opposite halves, byes (bottom
// seeds) land against top seeds, never against each other.
// size 4 → [0,3,1,2], size 8 → [0,7,3,4,1,6,2,5]
function bracketOrder(size) {
  let order = [0, 1]
  while (order.length < size) {
    const n = order.length * 2
    order = order.flatMap(x => [x, n - 1 - x])
  }
  return order
}

// Players are treated as a seed ranking (first = top seed) unless prePaired,
// in which case they are already laid out in bracket order (adjacent pairs
// meet) — used by the league formats that build their own matchups.
export function generate(players, { prePaired = false } = {}) {
  const size = nextPow2(players.length)
  const padded = [...players, ...Array(size - players.length).fill(null)]
  const seeded = prePaired ? padded : bracketOrder(size).map(i => padded[i])
  const totalRounds = Math.log2(size)
  const matches = []

  // Round 1 — seed actual players
  for (let pos = 0; pos < size / 2; pos++) {
    const p1 = seeded[pos * 2]
    const p2 = seeded[pos * 2 + 1]
    const result = (p2 === null) ? { winnerId: p1.id }
                 : (p1 === null) ? { winnerId: p2.id }
                 : null
    matches.push({
      id: crypto.randomUUID(),
      round: 1,
      position: pos,
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      result,
    })
  }

  // Subsequent rounds — TBD slots, winners filled in by advanceWinners
  for (let round = 2; round <= totalRounds; round++) {
    const slots = size / Math.pow(2, round)
    for (let pos = 0; pos < slots; pos++) {
      matches.push({ id: crypto.randomUUID(), round, position: pos, player1Id: null, player2Id: null, result: null })
    }
  }

  return advanceWinners(matches)
}

// Called after every result entry to propagate winners into downstream slots.
export function advanceWinners(matches) {
  const updated = matches.map(m => ({ ...m }))
  const bySlot = new Map(updated.map(m => [`${m.round}:${m.position}`, m]))

  for (const m of updated) {
    if (!m.result?.winnerId) continue
    const downstream = bySlot.get(`${m.round + 1}:${Math.floor(m.position / 2)}`)
    if (!downstream) continue
    if (m.position % 2 === 0) downstream.player1Id = m.result.winnerId
    else downstream.player2Id = m.result.winnerId
  }
  return updated
}

// Best-of-N: a game result appends to the match; the match result locks in
// when one player reaches the required win count.
export function recordGame(matches, matchId, game, bestOf) {
  const needed = Math.ceil(bestOf / 2)
  return matches.map(m => {
    if (m.id !== matchId) return m
    const games = [...(m.games ?? []), game]
    const wins = games.filter(g => g.winnerId === game.winnerId).length
    return { ...m, games, result: wins >= needed ? { winnerId: game.winnerId } : m.result }
  })
}

export const seriesWins = (match, playerId) =>
  match.games?.filter(g => g.winnerId === playerId).length ?? 0

// Clear a result and every result on its downstream path, then re-propagate.
// Rounds beyond the first get their slots rebuilt from surviving results.
export function clearResult(matches, matchId) {
  const target = matches.find(m => m.id === matchId)
  if (!target) return matches

  const maxRound = Math.max(...matches.map(m => m.round))
  const onPath = new Set([matchId])
  for (let r = target.round + 1, p = Math.floor(target.position / 2); r <= maxRound; r++, p = Math.floor(p / 2)) {
    const m = matches.find(x => x.round === r && x.position === p)
    if (m) onPath.add(m.id)
  }

  const updated = matches.map(m => ({
    ...m,
    result: onPath.has(m.id) ? null : m.result,
    games: onPath.has(m.id) ? undefined : m.games,
    ...(m.round > 1 ? { player1Id: null, player2Id: null } : {}),
  }))
  return advanceWinners(updated)
}

export function isComplete(matches) {
  if (!matches.length) return false
  const maxRound = Math.max(...matches.map(m => m.round))
  return matches.find(m => m.round === maxRound && m.position === 0)?.result != null
}
