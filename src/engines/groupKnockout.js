import * as RR from './roundRobin.js'
import * as SE from './singleElimination.js'

export const MIN_PLAYERS = 4
const GROUP_LETTERS = 'ABCDEFGH'

// Groups of ~4, assigned in roster order round-robin (A, B, ..., A, B, ...).
export function generateGroups(players) {
  const numGroups = Math.min(GROUP_LETTERS.length, Math.max(2, Math.round(players.length / 4)))
  const groups = Array.from({ length: numGroups }, () => [])
  players.forEach((p, i) => groups[i % numGroups].push(p))

  return groups.flatMap((groupPlayers, g) =>
    RR.generate(groupPlayers).map(m => ({ ...m, phase: 'groups', group: GROUP_LETTERS[g] }))
  )
}

export const groupNames = (matches) =>
  [...new Set(matches.filter(m => m.phase === 'groups').map(m => m.group))].sort()

export const groupMatches = (matches, group) =>
  matches.filter(m => m.phase === 'groups' && m.group === group)

export function groupPlayers(players, matches, group) {
  const ids = new Set(groupMatches(matches, group).flatMap(m => [m.player1Id, m.player2Id]))
  return players.filter(p => ids.has(p.id))
}

export const groupsComplete = (matches) =>
  matches.filter(m => m.phase === 'groups').every(m => m.result !== null)

export const knockoutStarted = (matches) => matches.some(m => m.phase === 'knockout')

// Top 2 per group, cross-seeded so round 1 pairs A1 vs B2, B1 vs C2, ..., last winner vs A2.
export function generateKnockout(players, matches) {
  const groups = groupNames(matches)
  const top2 = groups.map(g =>
    RR.computeStandings(groupPlayers(players, matches, g), groupMatches(matches, g)).slice(0, 2)
  )
  const seeds = groups.flatMap((_, i) => [top2[i][0], top2[(i + 1) % groups.length][1]])
  const knockout = SE.generate(seeds).map(m => ({ ...m, phase: 'knockout' }))
  return [...matches, ...knockout]
}

export const knockoutMatches = (matches) => matches.filter(m => m.phase === 'knockout')

export function isComplete(matches) {
  const ko = knockoutMatches(matches)
  return ko.length > 0 && SE.isComplete(ko)
}
