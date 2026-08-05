import { computeStandings } from './roundRobin.js'

export const totalRounds = (playerCount) => Math.ceil(Math.log2(playerCount))

export const currentRound = (matches) =>
  matches.length ? Math.max(...matches.map(m => m.round)) : 0

export const roundComplete = (matches, round) =>
  matches.filter(m => m.round === round).every(m => m.result !== null)

// Pair adjacent players in the standings, skipping pairs that already met.
// Odd player out (lowest ranked) gets a bye: auto-win worth 3 pts.
export function generateNextRound(players, matches) {
  const round = currentRound(matches) + 1
  const ranked = round === 1 ? [...players] : computeStandings(players, matches)

  const played = new Set(
    matches.map(m => [m.player1Id, m.player2Id].sort().join(':'))
  )

  const pool = ranked.map(p => p.id)
  const newMatches = []

  while (pool.length > 1) {
    const p1 = pool.shift()
    let idx = pool.findIndex(p2 => !played.has([p1, p2].sort().join(':')))
    if (idx === -1) idx = 0 // rematch unavoidable
    const p2 = pool.splice(idx, 1)[0]
    newMatches.push({ id: crypto.randomUUID(), round, player1Id: p1, player2Id: p2, result: null })
  }

  if (pool.length === 1) {
    newMatches.push({
      id: crypto.randomUUID(),
      round,
      player1Id: pool[0],
      player2Id: null, // bye
      result: { winner: 'player1' },
    })
  }

  return [...matches, ...newMatches]
}

export function isComplete(players, matches) {
  const total = totalRounds(players.length)
  return currentRound(matches) >= total && roundComplete(matches, currentRound(matches))
}
