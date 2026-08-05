import * as RR from './roundRobin.js'
import * as SE from './singleElimination.js'

export const MIN_PLAYERS = 4

export const generateSeason = (players) =>
  RR.generate(players).map(m => ({ ...m, phase: 'season' }))

export const seasonMatches = (matches) => matches.filter(m => m.phase === 'season')
export const knockoutMatches = (matches) => matches.filter(m => m.phase === 'knockout')

export const seasonComplete = (matches) =>
  seasonMatches(matches).every(m => m.result !== null)

export const playoffsStarted = (matches) => knockoutMatches(matches).length > 0

// Top 4 qualify (top 8 when 8+ players). SE.generate handles standard
// bracket seeding, so the standings order is the seed ranking.
export function playoffSize(playerCount) {
  return playerCount >= 8 ? 8 : 4
}

export function generatePlayoffs(players, matches) {
  const standings = RR.computeStandings(players, seasonMatches(matches))
  const qualified = standings.slice(0, playoffSize(players.length))
  const knockout = SE.generate(qualified).map(m => ({ ...m, phase: 'knockout' }))
  return [...matches, ...knockout]
}

export function isComplete(matches) {
  const ko = knockoutMatches(matches)
  return ko.length > 0 && SE.isComplete(ko)
}
