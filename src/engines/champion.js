import * as RR from './roundRobin.js'
import * as Racing from './racing.js'

// Winner of a finished tournament, or null while undecided.
// Bracket formats: winner of the final. Standings formats: current leader.
export function getChampion(tournament) {
  const { format, players, matches, points } = tournament
  if (!matches?.length || !players?.length) return null

  if (format === 'racing') {
    return Racing.computeStandings(players, matches, tournament.positionPoints ?? null)[0] ?? null
  }

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

  return RR.computeStandings(players, matches, points)[0] ?? null
}
