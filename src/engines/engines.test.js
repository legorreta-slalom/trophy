import { describe, it, expect } from 'vitest'
import * as RR from './roundRobin.js'
import * as SE from './singleElimination.js'
import * as SW from './swiss.js'
import * as GK from './groupKnockout.js'
import * as SP from './seasonPlayoffs.js'
import * as CF from './conferenceFinals.js'
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
    const p = players(3)
    // p1 beats p2, p2 beats p3, p3 beats p1 — full circle, all 3 pts.
    // Then p1 also gets a draw vs p2 in a rematch? Keep simple: craft 4 players.
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
