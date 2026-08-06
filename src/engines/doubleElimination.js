import { nextPow2, bracketOrder } from './singleElimination.js'

// Double elimination: winners (W) and losers (L) brackets plus a grand final.
// First loss drops you to L; second eliminates. If the L champion wins the
// grand final, a reset match (GF round 2) decides it — the W champion still
// had a life.
//
// Match: { id, bracket: 'W'|'L'|'GF', round, position, player1Id, player2Id, result }
// Slots hold a playerId, or null meaning "not decided yet" OR "empty (bye)";
// byes never sit unresolved — propagation resolves them in the same pass.

export const MIN_PLAYERS = 3

const mk = (bracket, round, position) => ({
  id: crypto.randomUUID(), bracket, round, position,
  player1Id: null, player2Id: null, result: null,
})

export function generate(players) {
  const size = nextPow2(players.length)
  const n = Math.log2(size)
  const padded = [...players, ...Array(size - players.length).fill(null)]
  const seeded = bracketOrder(size).map(i => padded[i])
  const matches = []

  for (let p = 0; p < size / 2; p++) {
    const p1 = seeded[p * 2]
    const p2 = seeded[p * 2 + 1]
    matches.push({
      ...mk('W', 1, p),
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      result: p1 && !p2 ? { winnerId: p1.id } : !p1 && p2 ? { winnerId: p2.id } : null,
    })
  }
  for (let r = 2; r <= n; r++) {
    for (let p = 0; p < size / 2 ** r; p++) matches.push(mk('W', r, p))
  }
  for (let k = 1; k <= n - 1; k++) {
    const count = size / 2 ** (k + 1)
    for (let p = 0; p < count; p++) matches.push(mk('L', 2 * k - 1, p))
    for (let p = 0; p < count; p++) matches.push(mk('L', 2 * k, p))
  }
  matches.push(mk('GF', 1, 0))

  return propagate(matches, n)
}

const find = (matches, bracket, round, position) =>
  matches.find(m => m.bracket === bracket && m.round === round && m.position === position)

const winnerOf = (m) => m?.result ? m.result.winnerId : undefined
const loserOf = (m) => m?.result
  ? (m.result.winnerId === m.player1Id ? m.player2Id : m.player1Id)
  : undefined

// Which decided-feeder value belongs in each slot of a match. undefined = feeder
// not decided yet (leave slot alone).
function feeds(matches, m, n) {
  const { bracket, round: r, position: p } = m
  if (bracket === 'W' && r >= 2) {
    return [winnerOf(find(matches, 'W', r - 1, 2 * p)), winnerOf(find(matches, 'W', r - 1, 2 * p + 1))]
  }
  if (bracket === 'L' && r === 1) {
    return [loserOf(find(matches, 'W', 1, 2 * p)), loserOf(find(matches, 'W', 1, 2 * p + 1))]
  }
  if (bracket === 'L' && r % 2 === 0) {
    const k = r / 2
    const count = matches.filter(x => x.bracket === 'L' && x.round === r).length
    return [winnerOf(find(matches, 'L', r - 1, p)), loserOf(find(matches, 'W', k + 1, count - 1 - p))]
  }
  if (bracket === 'L') { // odd round >= 3
    return [winnerOf(find(matches, 'L', r - 1, 2 * p)), winnerOf(find(matches, 'L', r - 1, 2 * p + 1))]
  }
  if (bracket === 'GF' && r === 1) {
    // n === 1 degenerate case (2 players): W1 winner vs W1 loser
    const lFinal = n === 1 ? undefined : find(matches, 'L', 2 * (n - 1), 0)
    return [
      winnerOf(find(matches, 'W', n, 0)),
      n === 1 ? loserOf(find(matches, 'W', 1, 0)) : winnerOf(lFinal),
    ]
  }
  return [undefined, undefined] // GF round 2 gets its slots at creation
}

export function propagate(matches, nOverride) {
  const size = matches.filter(m => m.bracket === 'W' && m.round === 1).length * 2
  const n = nOverride ?? Math.log2(size)
  let updated = matches.map(m => ({ ...m }))

  for (let pass = 0; pass < updated.length; pass++) {
    let changed = false
    for (const m of updated) {
      if (m.bracket === 'W' && m.round === 1) continue
      if (m.bracket === 'GF' && m.round === 2) continue
      const [f1, f2] = feeds(updated, m, n)
      if (f1 !== undefined && m.player1Id !== f1) { m.player1Id = f1; changed = true }
      if (f2 !== undefined && m.player2Id !== f2) { m.player2Id = f2; changed = true }
      // Bye/empty auto-resolve once both feeders are decided
      if (!m.result && f1 !== undefined && f2 !== undefined && (f1 === null || f2 === null)) {
        m.result = { winnerId: f1 ?? f2 }
        changed = true
      }
    }
    if (!changed) break
  }
  return updated
}

export const grandFinal = (matches) => find(matches, 'GF', 1, 0)
export const resetMatch = (matches) => find(matches, 'GF', 2, 0)

// L champion won the grand final → both are on one loss → play a reset.
export function needsReset(matches) {
  const gf = grandFinal(matches)
  return Boolean(gf?.result && gf.result.winnerId === gf.player2Id && !resetMatch(matches))
}

export function withResetIfNeeded(matches) {
  if (!needsReset(matches)) return matches
  const gf = grandFinal(matches)
  return [...matches, {
    ...mk('GF', 2, 0),
    player1Id: gf.player1Id,
    player2Id: gf.player2Id,
  }]
}

export function isComplete(matches) {
  const reset = resetMatch(matches)
  if (reset) return reset.result !== null
  const gf = grandFinal(matches)
  return Boolean(gf?.result && gf.result.winnerId === gf.player1Id)
}

export function getWinnerId(matches) {
  if (!isComplete(matches)) return null
  return resetMatch(matches)?.result?.winnerId ?? grandFinal(matches).result.winnerId
}
