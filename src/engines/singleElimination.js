function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

export function generate(players) {
  const size = nextPow2(players.length)
  // Pad with nulls (byes) to fill the bracket
  const seeded = [...players, ...Array(size - players.length).fill(null)]
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

export function isComplete(matches) {
  if (!matches.length) return false
  const maxRound = Math.max(...matches.map(m => m.round))
  return matches.find(m => m.round === maxRound && m.position === 0)?.result != null
}
