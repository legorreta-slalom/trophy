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

// Top 4 qualify (top 8 when 8+ players). Standard bracket seeding: the two
// top seeds land in opposite halves so they can only meet in the final.
const SEED_ORDER = { 4: [0, 3, 1, 2], 8: [0, 7, 3, 4, 1, 6, 2, 5] }

export function playoffSize(playerCount) {
  return playerCount >= 8 ? 8 : 4
}

export function generatePlayoffs(players, matches) {
  const standings = RR.computeStandings(players, seasonMatches(matches))
  const size = playoffSize(players.length)
  const qualified = standings.slice(0, size)
  const seeds = SEED_ORDER[size].map(i => qualified[i])
  const knockout = SE.generate(seeds).map(m => ({ ...m, phase: 'knockout' }))
  return [...matches, ...knockout]
}

export function isComplete(matches) {
  const ko = knockoutMatches(matches)
  return ko.length > 0 && SE.isComplete(ko)
}
