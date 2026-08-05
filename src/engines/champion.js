import * as RR from './roundRobin.js'

// Winner of a finished tournament, or null while undecided.
// Bracket formats: winner of the final. Standings formats: current leader.
export function getChampion(tournament) {
  const { format, players, matches } = tournament
  if (!matches?.length || !players?.length) return null

  const bracketMatches =
    format === 'single-elimination' ? matches
    : ['group-knockout', 'season-playoffs', 'conference-finals'].includes(format)
      ? matches.filter(m => m.phase === 'knockout')
      : null

  if (bracketMatches) {
    if (!bracketMatches.length) return null
    const maxRound = Math.max(...bracketMatches.map(m => m.round))
    const final = bracketMatches.find(m => m.round === maxRound && m.position === 0)
    return players.find(p => p.id === final?.result?.winnerId) ?? null
  }

  return RR.computeStandings(players, matches)[0] ?? null
}
