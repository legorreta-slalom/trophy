import * as RR from './roundRobin.js'
import * as SE from './singleElimination.js'
import { groupPlayers, groupMatches, groupsComplete, knockoutStarted, knockoutMatches, isComplete } from './groupKnockout.js'

export const MIN_PLAYERS = 6
export const CONFERENCES = ['East', 'West']

// Alternate roster order into East/West; round robin season within each conference.
// Matches reuse the 'groups' phase so the conference views share the group machinery.
export function generateConferences(players) {
  const conferences = [[], []]
  players.forEach((p, i) => conferences[i % 2].push(p))
  return conferences.flatMap((confPlayers, c) =>
    RR.generate(confPlayers).map(m => ({ ...m, phase: 'groups', group: CONFERENCES[c] }))
  )
}

// Top 2 per conference. Conference finals stay in-conference (E1 vs E2, W1 vs W2);
// winners meet in the championship.
export function generateFinals(players, matches, points) {
  const seeds = CONFERENCES.flatMap(conf =>
    RR.computeStandings(groupPlayers(players, matches, conf), groupMatches(matches, conf), points).slice(0, 2)
  )
  const knockout = SE.generate(seeds, { prePaired: true }).map(m => ({ ...m, phase: 'knockout' }))
  return [...matches, ...knockout]
}

export { groupsComplete as conferencesComplete, knockoutStarted as finalsStarted, knockoutMatches, isComplete }
