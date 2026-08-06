import { describe, it, expect } from 'vitest'
import * as RR from './roundRobin.js'
import * as SE from './singleElimination.js'
import * as SW from './swiss.js'
import * as GK from './groupKnockout.js'
import * as SP from './seasonPlayoffs.js'
import * as CF from './conferenceFinals.js'
import * as Racing from './racing.js'
import * as DE from './doubleElimination.js'
import { getChampion } from './champion.js'

const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
const winAll = (matches, winner = 'player1') =>
  matches.map(m => ({ ...m, result: m.result ?? { winner } }))

describe('round robin', () => {
  it('generates n*(n-1)/2 matches with no player twice per round', () => {
    for (const n of [4, 5, 7, 8]) {
      const matches = RR.generate(players(n))
      expect(matches).toHaveLength(n * (n - 1) / 2)
      const rounds = {}
      for (const m of matches) {
        rounds[m.round] ??= new Set()
        expect(rounds[m.round].has(m.player1Id)).toBe(false)
        expect(rounds[m.round].has(m.player2Id)).toBe(false)
        rounds[m.round].add(m.player1Id).add(m.player2Id)
      }
    }
  })

  it('scores 3/1/0 and counts games', () => {
    const p = players(3)
    const matches = winAll(RR.generate(p))
    const rows = RR.computeStandings(p, matches)
    expect(rows.reduce((s, r) => s + r.pts, 0)).toBe(9)
    expect(rows.every(r => r.played === 2)).toBe(true)
  })

  it('breaks points ties by head-to-head', () => {
    const q = players(4)
    const m = (a, b, winner) => ({ id: `${a}${b}`, round: 1, player1Id: a, player2Id: b, result: { winner } })
    // p1 and p2 both finish on 6 pts; p1 beat p2 head-to-head.
    const matches = [
      m('p2', 'p1', 'player2'), // p1 beats p2
      m('p1', 'p3', 'player1'),
      m('p2', 'p3', 'player1'),
      m('p2', 'p4', 'player1'),
      m('p1', 'p4', 'player2'), // p4 beats p1 → p1: 6 pts, p2: 6 pts
    ]
    const rows = RR.computeStandings(q, matches)
    expect(rows[0].id).toBe('p1')
    expect(rows[1].id).toBe('p2')
  })
})

describe('single elimination', () => {
  it('pads 5 players to 8 with 3 auto-resolved byes', () => {
    const matches = SE.generate(players(5))
    expect(matches).toHaveLength(7)
    const byes = matches.filter(m => m.round === 1 && m.player2Id === null)
    expect(byes).toHaveLength(3)
    expect(byes.every(m => m.result?.winnerId === m.player1Id)).toBe(true)
  })

  it('propagates winners downstream', () => {
    let matches = SE.generate(players(4))
    const semi = matches.find(m => m.round === 1 && m.position === 0)
    matches = SE.advanceWinners(matches.map(m => m.id === semi.id ? { ...m, result: { winnerId: 'p1' } } : m))
    expect(matches.find(m => m.round === 2).player1Id).toBe('p1')
  })

  it('clearResult cascades down the path and re-propagates', () => {
    let matches = SE.generate(players(4))
    for (const m of matches.filter(m => m.round === 1)) {
      matches = SE.advanceWinners(matches.map(x => x.id === m.id ? { ...x, result: { winnerId: x.player1Id } } : x))
    }
    const final = matches.find(m => m.round === 2)
    matches = matches.map(m => m.id === final.id ? { ...m, result: { winnerId: 'p1' } } : m)
    expect(SE.isComplete(matches)).toBe(true)

    const semi0 = matches.find(m => m.round === 1 && m.position === 0)
    const cleared = SE.clearResult(matches, semi0.id)
    const newFinal = cleared.find(m => m.round === 2)
    expect(cleared.find(m => m.id === semi0.id).result).toBeNull()
    expect(newFinal.result).toBeNull()
    expect(newFinal.player1Id).toBeNull()   // cleared semi's slot emptied
    expect(newFinal.player2Id).toBe('p2')   // other semi (p2 vs p3) untouched
  })
})

describe('swiss', () => {
  it('gives the odd player a bye worth a win', () => {
    const p = players(5)
    const r1 = SW.generateNextRound(p, [])
    const bye = r1.find(m => m.player2Id === null)
    expect(bye.result.winner).toBe('player1')
    expect(r1).toHaveLength(3)
  })

  it('avoids rematches in later rounds', () => {
    const p = players(4)
    let matches = winAll(SW.generateNextRound(p, []))
    matches = SW.generateNextRound(p, matches)
    const seen = new Set(matches.slice(0, 2).map(m => [m.player1Id, m.player2Id].sort().join(':')))
    for (const m of matches.slice(2)) {
      expect(seen.has([m.player1Id, m.player2Id].sort().join(':'))).toBe(false)
    }
  })

  it('completes after ceil(log2(n)) rounds', () => {
    const p = players(4)
    let matches = winAll(SW.generateNextRound(p, []))
    expect(SW.isComplete(p, matches)).toBe(false)
    matches = winAll(SW.generateNextRound(p, matches))
    expect(SW.isComplete(p, matches)).toBe(true)
  })
})

describe('group + knockout', () => {
  it('splits 8 players into 2 groups with round robins', () => {
    const matches = GK.generateGroups(players(8))
    expect(GK.groupNames(matches)).toEqual(['A', 'B'])
    expect(GK.groupMatches(matches, 'A')).toHaveLength(6)
  })

  it('cross-seeds so groupmates cannot meet in round 1', () => {
    const p = players(8)
    const matches = GK.generateKnockout(p, winAll(GK.generateGroups(p)))
    const ko = GK.knockoutMatches(matches).filter(m => m.round === 1)
    for (const m of ko) {
      const groupOf = (id) => GK.groupNames(matches).find(g =>
        GK.groupPlayers(p, matches, g).some(x => x.id === id))
      expect(groupOf(m.player1Id)).not.toBe(groupOf(m.player2Id))
    }
  })
})

describe('season + playoffs', () => {
  it('seeds top 4 so seeds 1 and 2 are in opposite halves', () => {
    const p = players(6)
    const matches = SP.generatePlayoffs(p, winAll(SP.generateSeason(p)))
    const standings = RR.computeStandings(p, SP.seasonMatches(matches))
    const semis = SP.knockoutMatches(matches).filter(m => m.round === 1)
    const semiOf = (id) => semis.findIndex(m => m.player1Id === id || m.player2Id === id)
    expect(semiOf(standings[0].id)).not.toBe(semiOf(standings[1].id))
  })
})

describe('conference + finals', () => {
  it('keeps conference finals in-conference', () => {
    const p = players(8)
    const matches = CF.generateFinals(p, winAll(CF.generateConferences(p)))
    const finals = CF.knockoutMatches(matches).filter(m => m.round === 1)
    const confOf = (id) => CF.CONFERENCES.find(c =>
      GK.groupPlayers(p, matches, c).some(x => x.id === id))
    for (const m of finals) {
      expect(confOf(m.player1Id)).toBe(confOf(m.player2Id))
    }
  })
})

describe('double elimination', () => {
  const play = (matches, bracket, round, position, winnerId) =>
    DE.withResetIfNeeded(DE.propagate(matches.map(m =>
      m.bracket === bracket && m.round === round && m.position === position
        ? { ...m, result: { winnerId } } : m
    )))

  it('runs a 4-player bracket: drop, climb, reset, crown', () => {
    let m = DE.generate(players(4))
    // W1: p1 vs p4, p2 vs p3 (standard seeding)
    m = play(m, 'W', 1, 0, 'p1')
    m = play(m, 'W', 1, 1, 'p2')
    const l1 = m.find(x => x.bracket === 'L' && x.round === 1)
    expect([l1.player1Id, l1.player2Id].sort()).toEqual(['p3', 'p4'])
    m = play(m, 'L', 1, 0, 'p4') // p3 eliminated
    m = play(m, 'W', 2, 0, 'p1') // p2 drops to L2
    const l2 = m.find(x => x.bracket === 'L' && x.round === 2)
    expect([l2.player1Id, l2.player2Id].sort()).toEqual(['p2', 'p4'])
    m = play(m, 'L', 2, 0, 'p2') // p4 eliminated
    const gf = DE.grandFinal(m)
    expect(gf.player1Id).toBe('p1') // W champ
    expect(gf.player2Id).toBe('p2') // L champ
    // L champ wins the grand final → reset match appears
    m = play(m, 'GF', 1, 0, 'p2')
    expect(DE.isComplete(m)).toBe(false)
    expect(DE.resetMatch(m)).toBeTruthy()
    m = play(m, 'GF', 2, 0, 'p1')
    expect(DE.isComplete(m)).toBe(true)
    expect(DE.getWinnerId(m)).toBe('p1')
  })

  it('W champion winning the grand final ends it without a reset', () => {
    let m = DE.generate(players(4))
    m = play(m, 'W', 1, 0, 'p1')
    m = play(m, 'W', 1, 1, 'p2')
    m = play(m, 'L', 1, 0, 'p3')
    m = play(m, 'W', 2, 0, 'p1')
    m = play(m, 'L', 2, 0, 'p3')
    m = play(m, 'GF', 1, 0, 'p1')
    expect(DE.resetMatch(m)).toBeUndefined()
    expect(DE.isComplete(m)).toBe(true)
    expect(DE.getWinnerId(m)).toBe('p1')
  })

  it('auto-resolves byes through the losers bracket (5 players)', () => {
    const m = DE.generate(players(5))
    // Three W1 byes mean an L1 match of two empties resolves itself
    const emptyL1 = m.filter(x => x.bracket === 'L' && x.round === 1 && x.result?.winnerId === null)
    expect(emptyL1.length).toBeGreaterThan(0)
    expect(() => DE.propagate(m)).not.toThrow()
  })
})

describe('best-of-N series', () => {
  it('resolves the match at the majority, not before', () => {
    let matches = SE.generate(players(2))
    const id = matches[0].id
    matches = SE.recordGame(matches, id, { winnerId: 'p1' }, 3)
    expect(matches[0].result).toBeNull()
    matches = SE.recordGame(matches, id, { winnerId: 'p2' }, 3)
    expect(matches[0].result).toBeNull()
    matches = SE.recordGame(matches, id, { winnerId: 'p1' }, 3)
    expect(matches[0].result).toEqual({ winnerId: 'p1' })
    expect(SE.seriesWins(matches[0], 'p1')).toBe(2)
    expect(SE.seriesWins(matches[0], 'p2')).toBe(1)
  })

  it('clearResult strips games along the path', () => {
    let matches = SE.generate(players(2))
    const id = matches[0].id
    matches = SE.recordGame(matches, id, { winnerId: 'p1' }, 3)
    matches = SE.recordGame(matches, id, { winnerId: 'p1' }, 3)
    matches = SE.clearResult(matches, id)
    expect(matches[0].result).toBeNull()
    expect(matches[0].games).toBeUndefined()
  })
})

describe('custom points', () => {
  it('applies a 2-1-0 scheme', () => {
    const p = players(2)
    const matches = [{ id: 'm', round: 1, player1Id: 'p1', player2Id: 'p2', result: { winner: 'player1' } }]
    const rows = RR.computeStandings(p, matches, { win: 2, draw: 1, loss: 0 })
    expect(rows[0].pts).toBe(2)
  })

  it('can award loss points (participation schemes)', () => {
    const p = players(2)
    const matches = [{ id: 'm', round: 1, player1Id: 'p1', player2Id: 'p2', result: { winner: 'player1' } }]
    const rows = RR.computeStandings(p, matches, { win: 3, draw: 2, loss: 1 })
    expect(rows[1].pts).toBe(1)
  })
})

describe('racing', () => {
  it('scores linear points by heat size', () => {
    const p = players(4)
    let matches = Racing.recordHeat([], ['p2', 'p1', 'p3'])   // 3 racers: 3/2/1 pts
    matches = Racing.recordHeat(matches, ['p1', 'p2', 'p3', 'p4']) // 4 racers: 4/3/2/1
    const rows = Racing.computeStandings(p, matches, null)
    expect(rows[0].id).toBe('p1') // 2 + 4 = 6
    expect(rows[0].pts).toBe(6)
    expect(rows[0].wins).toBe(1)
    expect(rows.find(r => r.id === 'p2').pts).toBe(6) // 3 + 3 — tied on pts, p1 ahead on wins? both have 1 win
    expect(rows.find(r => r.id === 'p4').races).toBe(1)
  })

  it('scores from a position table, zero beyond table length', () => {
    const p = players(3)
    const matches = Racing.recordHeat([], ['p1', 'p2', 'p3'])
    const rows = Racing.computeStandings(p, matches, [10, 5])
    expect(rows.find(r => r.id === 'p1').pts).toBe(10)
    expect(rows.find(r => r.id === 'p3').pts).toBe(0)
  })

  it('numbers heats sequentially', () => {
    let matches = Racing.recordHeat([], ['p1', 'p2'])
    matches = Racing.recordHeat(matches, ['p2', 'p1'])
    expect(matches.map(m => m.heat)).toEqual([1, 2])
  })
})

describe('elo', () => {
  const t = (id, gameId, matches, names = ['Alice', 'Bob']) => ({
    id, gameId, startDate: '2026-01-01', players: names.map((name, i) => ({ id: `${id}-p${i + 1}`, name })),
    matches,
  })

  it('winner gains what the loser drops; equal ratings move by K/2', async () => {
    const { computeElo, eloFor } = await import('./elo.js')
    const ratings = computeElo([
      t('t1', 'g1', [{ id: 'm', player1Id: 't1-p1', player2Id: 't1-p2', result: { winner: 'player1' } }]),
    ])
    expect(eloFor(ratings, 'alice').rating).toBe(1016)
    expect(eloFor(ratings, 'Bob').rating).toBe(984)
  })

  it('filters by game and skips pending/racing entries', async () => {
    const { computeElo, eloFor } = await import('./elo.js')
    const ratings = computeElo([
      t('t1', 'g1', [
        { id: 'm1', player1Id: 't1-p1', player2Id: 't1-p2', result: { winner: 'player1' } },
        { id: 'm2', player1Id: 't1-p1', player2Id: 't1-p2', result: { winner: 'player2' }, pendingEntry: {} },
      ]),
      t('t2', 'g2', [{ id: 'm3', player1Id: 't2-p1', player2Id: 't2-p2', result: { winner: 'player2' } }]),
    ], 'g1')
    expect(eloFor(ratings, 'Alice').games).toBe(1)
  })
})

describe('champion', () => {
  it('resolves the bracket winner', () => {
    const p = players(4)
    let matches = SE.generate(p)
    for (const round of [1, 2]) {
      matches = SE.advanceWinners(matches.map(m =>
        m.round === round && !m.result ? { ...m, result: { winnerId: m.player1Id } } : m))
    }
    expect(getChampion({ format: 'single-elimination', players: p, matches }).id).toBe('p1')
  })

  it('resolves the standings leader', () => {
    const p = players(3)
    const matches = winAll(RR.generate(p))
    const leader = RR.computeStandings(p, matches)[0]
    expect(getChampion({ format: 'round-robin', players: p, matches }).id).toBe(leader.id)
  })
})
