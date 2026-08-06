// Builds a demo localStorage seed using the real engines, for progress screenshots.
import { mkdirSync, writeFileSync } from 'fs'
import * as RR from '../src/engines/roundRobin.js'
import * as SE from '../src/engines/singleElimination.js'
import * as SW from '../src/engines/swiss.js'
import * as GK from '../src/engines/groupKnockout.js'
import * as SP from '../src/engines/seasonPlayoffs.js'
import * as CF from '../src/engines/conferenceFinals.js'
import * as Racing from '../src/engines/racing.js'
import * as DE from '../src/engines/doubleElimination.js'

const players = (names, prefix) => names.map((name, i) => ({ id: `${prefix}${i + 1}`, name }))
const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank']

const games = [
  { id: 'game-foos', name: 'Foosball' },
  { id: 'game-pong', name: 'Ping Pong' },
  { id: 'game-chess', name: 'Chess' },
  { id: 'game-darts', name: 'Darts' },
]

// Deterministic "random" winner
const pick = (i) => (i % 3 === 0 ? 'player2' : i % 5 === 0 ? 'draw' : 'player1')
const playAll = (matches) => matches.map((m, i) => ({ ...m, result: m.result ?? { winner: pick(i) } }))
const playSome = (matches, n) => matches.map((m, i) => i < n && !m.result ? { ...m, result: { winner: pick(i) } } : m)

const tournaments = []

// Round Robin — mid-tournament
{
  const p = players(NAMES.slice(0, 4), 'rr')
  tournaments.push({
    id: 'demo-rr', name: 'Q3 Ping Pong League', gameId: 'game-pong', format: 'round-robin',
    startDate: '2026-08-01', endDate: '2026-08-31', status: 'active',
    players: p, matches: playSome(RR.generate(p), 4),
  })
}

// Single Elimination — completed with champion
{
  const p = players(NAMES.slice(0, 8), 'se')
  let m = SE.generate(p)
  for (const round of [1, 2, 3]) {
    m = m.map(x => x.round === round && !x.result && x.player1Id && x.player2Id
      ? { ...x, result: { winnerId: x.player1Id } } : x)
    m = SE.advanceWinners(m)
  }
  tournaments.push({
    id: 'demo-se', name: 'Summer Chess Knockout', gameId: 'game-chess', format: 'single-elimination',
    startDate: '2026-07-01', endDate: '2026-07-31', status: 'completed',
    players: p, matches: m,
  })
}

// Swiss — round 1 done, round 2 generated and half-played
{
  const p = players(NAMES.slice(0, 5), 'sw')
  let m = playAll(SW.generateNextRound(p, []))
  m = playSome(SW.generateNextRound(p, m), m.length + 1)
  tournaments.push({
    id: 'demo-sw', name: 'Autumn Swiss Chess', gameId: 'game-chess', format: 'swiss',
    startDate: '2026-08-01', endDate: '2026-09-15', status: 'active',
    players: p, matches: m,
  })
}

// Leaderboard — a handful of ad-hoc results
{
  const p = players(['Xena', 'Yuri', 'Zoe'], 'lb')
  const pair = (a, b, winner) => ({ id: `lbm-${a}${b}`, round: 1, player1Id: `lb${a}`, player2Id: `lb${b}`, result: { winner } })
  tournaments.push({
    id: 'demo-lb', name: 'Open Darts Ladder', gameId: 'game-darts', format: 'leaderboard',
    startDate: '2026-06-01', endDate: '2026-07-31', status: 'completed',
    players: p, matches: [pair(1, 2, 'player1'), pair(2, 3, 'draw'), pair(1, 3, 'player1'), pair(2, 1, 'player2')],
  })
}

// Group + Knockout — groups done, semis played, final pending
{
  const p = players(NAMES, 'gk')
  let m = playAll(GK.generateGroups(p))
  m = GK.generateKnockout(p, m)
  m = m.map(x => x.phase === 'knockout' && x.round === 1 ? { ...x, result: { winnerId: x.player1Id } } : x)
  const ko = SE.advanceWinners(m.filter(x => x.phase === 'knockout'))
  m = [...m.filter(x => x.phase !== 'knockout'), ...ko]
  tournaments.push({
    id: 'demo-gk', name: 'World Cup Foosball', gameId: 'game-foos', format: 'group-knockout',
    startDate: '2026-09-01', endDate: '2026-09-30', status: 'active',
    players: p, matches: m,
  })
}

// Season + Playoffs — season done, playoffs just started
{
  const p = players(NAMES.slice(0, 6), 'sp')
  let m = playAll(SP.generateSeason(p))
  m = SP.generatePlayoffs(p, m)
  tournaments.push({
    id: 'demo-sp', name: 'MLB Ping Pong Season', gameId: 'game-pong', format: 'season-playoffs',
    startDate: '2026-09-01', endDate: '2026-11-30', status: 'active',
    players: p, matches: m,
  })
}

// Conference + Finals — conference seasons done, finals under way
{
  const p = players(NAMES, 'cf')
  let m = playAll(CF.generateConferences(p))
  m = CF.generateFinals(p, m)
  tournaments.push({
    id: 'demo-cf', name: 'NBA Foosball League', gameId: 'game-foos', format: 'conference-finals',
    startDate: '2026-09-01', endDate: '2026-12-15', status: 'active',
    players: p, matches: m,
  })
}

// Racing — Mario Kart points, three heats in
{
  const p = players(NAMES.slice(0, 4), 'race')
  let m = Racing.recordHeat([], ['race3', 'race1', 'race4', 'race2'])
  m = Racing.recordHeat(m, ['race1', 'race3', 'race2', 'race4'])
  m = Racing.recordHeat(m, ['race1', 'race2', 'race3', 'race4'])
  tournaments.push({
    id: 'demo-race', name: 'Mario Kart Grand Prix', gameId: 'game-foos', format: 'racing',
    startDate: '2026-08-01', endDate: '2026-08-31', status: 'active',
    positionPoints: [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    players: p, matches: m,
  })
}

// Double elimination — grand final reset pending
{
  const p = players(NAMES.slice(0, 4), 'de')
  const play = (matches, bracket, round, position, winnerId) =>
    DE.withResetIfNeeded(DE.propagate(matches.map(x =>
      x.bracket === bracket && x.round === round && x.position === position
        ? { ...x, result: { winnerId } } : x
    )))
  let m = DE.generate(p)
  m = play(m, 'W', 1, 0, 'de1')
  m = play(m, 'W', 1, 1, 'de2')
  m = play(m, 'L', 1, 0, 'de4')
  m = play(m, 'W', 2, 0, 'de1')
  m = play(m, 'L', 2, 0, 'de2')
  m = play(m, 'GF', 1, 0, 'de2') // L champ wins → reset match pending
  tournaments.push({
    id: 'demo-de', name: 'Smash Bros Double Elim', gameId: 'game-chess', format: 'double-elimination',
    startDate: '2026-08-01', endDate: '2026-08-31', status: 'active',
    players: p, matches: m,
  })
}

mkdirSync('scripts/seeds', { recursive: true })
writeFileSync('scripts/seeds/demo.json', JSON.stringify({
  'trophy:games': games,
  'trophy:tournaments': tournaments,
}, null, 2))
console.log(`scripts/seeds/demo.json — ${tournaments.length} tournaments`)
