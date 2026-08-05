import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title2, Title3, Body1Strong, Body1, Caption1,
  Button, Input, Field,
  Dropdown, Option,
  Badge,
  TabList, Tab,
  Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellActions,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, DialogTrigger,
  Popover, PopoverTrigger, PopoverSurface,
} from '@fluentui/react-components'
import { AddRegular, DeleteRegular, ChevronLeftRegular, DismissRegular, QrCodeRegular, ArrowUpRegular, ArrowDownRegular } from '@fluentui/react-icons'
import { useEffect } from 'react'
import QRCode from 'qrcode'
import { getTournaments, saveTournament, getGames } from '../store.js'
import { getAccess, getPublishSettings } from '../publish.js'
import UnlockDialog from '../components/UnlockDialog.jsx'
import { FORMATS, STATUS_APPEARANCE } from '../constants.js'
import * as RR from '../engines/roundRobin.js'
import * as SE from '../engines/singleElimination.js'
import * as SW from '../engines/swiss.js'
import * as GK from '../engines/groupKnockout.js'
import * as SP from '../engines/seasonPlayoffs.js'
import * as CF from '../engines/conferenceFinals.js'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  headerText: { flex: 1 },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  tabContent: { marginTop: '20px' },
  rosterAdd: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    alignItems: 'flex-end',
  },
  // Round robin
  roundSection: { marginBottom: '24px' },
  roundLabel: { marginBottom: '8px' },
  matchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  matchPlayers: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  matchVs: { color: tokens.colorNeutralForeground3 },
  matchResult: { display: 'flex', gap: '4px' },
  resultWinner: { fontWeight: 'bold', color: tokens.colorBrandForeground1 },
  // Bracket
  bracket: {
    display: 'flex',
    gap: '0',
    overflowX: 'auto',
    paddingBottom: '16px',
  },
  bracketRound: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '220px',
    flex: 1,
  },
  bracketRoundLabel: {
    textAlign: 'center',
    padding: '0 8px 12px',
    color: tokens.colorNeutralForeground2,
  },
  bracketMatches: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  bracketSlot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
  },
  bracketCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  bracketPlayer: {
    padding: '6px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
  },
  bracketPlayerWinner: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: 'bold',
  },
  bracketPlayerElim: { color: tokens.colorNeutralForeground3 },
  // Standings
  standingsTable: { maxWidth: '560px' },
  colName: { minWidth: '120px' },
  colStat: { width: '48px', textAlign: 'center' },
})

// Score entry: winner is inferred from the higher number.
function ScorePopover({ p1Name, p2Name, allowDraw, onSave }) {
  const [open, setOpen] = useState(false)
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const valid = a !== '' && b !== '' && (allowDraw || Number(a) !== Number(b))

  function save() {
    onSave([Number(a), Number(b)])
    setOpen(false)
    setA(''); setB('')
  }

  return (
    <Popover open={open} onOpenChange={(_, { open }) => setOpen(open)} positioning="below-end">
      <PopoverTrigger disableButtonEnhancement>
        <Button size="small" appearance="subtle">Score…</Button>
      </PopoverTrigger>
      <PopoverSurface style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '12px' }}>
        <Field label={p1Name}>
          <Input type="number" min="0" value={a} onChange={(_, { value }) => setA(value)} style={{ width: '72px' }} />
        </Field>
        <Field label={p2Name}>
          <Input type="number" min="0" value={b} onChange={(_, { value }) => setB(value)} style={{ width: '72px' }} />
        </Field>
        <Button appearance="primary" size="small" disabled={!valid} onClick={save}>Save</Button>
      </PopoverSurface>
    </Popover>
  )
}

const scoreLabel = (result) => result?.score ? ` ${result.score[0]}–${result.score[1]}` : ''

function roundLabel(round, maxRound) {
  if (round === maxRound) return 'Final'
  if (round === maxRound - 1) return 'Semi-final'
  if (round === maxRound - 2) return 'Quarter-final'
  return `Round ${round}`
}

function RoundRobinView({ matches, playerById, onResult, onClear }) {
  const styles = useStyles()
  const rounds = {}
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  }

  return (
    <>
      {Object.keys(rounds).sort((a, b) => +a - +b).map(r => (
        <div key={r} className={styles.roundSection}>
          <Body1Strong className={styles.roundLabel}>Round {r}</Body1Strong>
          {rounds[r].map(m => {
            const p1 = playerById[m.player1Id]
            const p2 = playerById[m.player2Id]
            return (
              <div key={m.id} className={styles.matchRow}>
                <div className={styles.matchPlayers}>
                  <Body1 className={m.result?.winner === 'player1' ? styles.resultWinner : ''}>{p1?.name ?? '?'}</Body1>
                  <Caption1 className={styles.matchVs}>vs</Caption1>
                  <Body1 className={m.result?.winner === 'player2' ? styles.resultWinner : ''}>{m.player2Id === null ? 'Bye' : p2?.name ?? '?'}</Body1>
                </div>
                {m.result ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Caption1>{m.player2Id === null ? 'Bye' : `${m.result.winner === 'draw' ? 'Draw' : m.result.winner === 'player1' ? `${p1?.name} wins` : `${p2?.name} wins`}${scoreLabel(m.result)}`}</Caption1>
                    {onClear && m.player2Id !== null && (
                      <Button appearance="subtle" size="small" icon={<DismissRegular />} aria-label="Clear result" onClick={() => onClear(m.id)} />
                    )}
                  </span>
                ) : onResult ? (
                  <div className={styles.matchResult}>
                    <Button size="small" onClick={() => onResult(m.id, { winner: 'player1' })}>{p1?.name}</Button>
                    <Button size="small" onClick={() => onResult(m.id, { winner: 'draw' })}>Draw</Button>
                    <Button size="small" onClick={() => onResult(m.id, { winner: 'player2' })}>{p2?.name}</Button>
                    <ScorePopover
                      p1Name={p1?.name}
                      p2Name={p2?.name}
                      allowDraw
                      onSave={(score) => onResult(m.id, {
                        winner: score[0] > score[1] ? 'player1' : score[1] > score[0] ? 'player2' : 'draw',
                        score,
                      })}
                    />
                  </div>
                ) : (
                  <Caption1>Pending</Caption1>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

function StandingsView({ players, matches }) {
  const styles = useStyles()
  const rows = RR.computeStandings(players, matches)
  return (
    <div className={styles.standingsTable}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell style={{ width: '32px' }}>#</TableHeaderCell>
            <TableHeaderCell className={styles.colName}>Player</TableHeaderCell>
            <TableHeaderCell className={styles.colStat}>Played</TableHeaderCell>
            <TableHeaderCell className={styles.colStat}>W</TableHeaderCell>
            <TableHeaderCell className={styles.colStat}>D</TableHeaderCell>
            <TableHeaderCell className={styles.colStat}>L</TableHeaderCell>
            <TableHeaderCell className={styles.colStat}>Pts</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p, i) => (
            <TableRow key={p.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className={styles.colName}><Body1Strong>{p.name}</Body1Strong></TableCell>
              <TableCell className={styles.colStat}>{p.played}</TableCell>
              <TableCell className={styles.colStat}>{p.w}</TableCell>
              <TableCell className={styles.colStat}>{p.d}</TableCell>
              <TableCell className={styles.colStat}>{p.l}</TableCell>
              <TableCell className={styles.colStat}><Body1Strong>{p.pts}</Body1Strong></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LeaderboardView({ tournament, playerById, onRecord, onDelete }) {
  const styles = useStyles()
  const [p1Id, setP1Id] = useState('')
  const [p2Id, setP2Id] = useState('')

  const players = tournament.players
  const canRecord = p1Id && p2Id && p1Id !== p2Id
  const recent = [...tournament.matches].reverse()

  function record(winner) {
    onRecord(p1Id, p2Id, { winner })
    setP1Id('')
    setP2Id('')
  }

  return (
    <>
      {tournament.status === 'active' && (
        <div className={styles.rosterAdd}>
          <Field label="Player 1">
            <Dropdown
              placeholder="Select"
              value={playerById[p1Id]?.name ?? ''}
              selectedOptions={p1Id ? [p1Id] : []}
              onOptionSelect={(_, { optionValue }) => setP1Id(optionValue)}
              style={{ minWidth: '160px' }}
            >
              {players.map(p => <Option key={p.id} value={p.id} disabled={p.id === p2Id}>{p.name}</Option>)}
            </Dropdown>
          </Field>
          <Field label="Player 2">
            <Dropdown
              placeholder="Select"
              value={playerById[p2Id]?.name ?? ''}
              selectedOptions={p2Id ? [p2Id] : []}
              onOptionSelect={(_, { optionValue }) => setP2Id(optionValue)}
              style={{ minWidth: '160px' }}
            >
              {players.map(p => <Option key={p.id} value={p.id} disabled={p.id === p1Id}>{p.name}</Option>)}
            </Dropdown>
          </Field>
          <Button disabled={!canRecord} onClick={() => record('player1')}>{playerById[p1Id]?.name ?? 'P1'} wins</Button>
          <Button disabled={!canRecord} onClick={() => record('draw')}>Draw</Button>
          <Button disabled={!canRecord} onClick={() => record('player2')}>{playerById[p2Id]?.name ?? 'P2'} wins</Button>
        </div>
      )}

      {recent.length === 0 ? (
        <Body1>No results recorded yet.</Body1>
      ) : (
        recent.map(m => {
          const p1 = playerById[m.player1Id]
          const p2 = playerById[m.player2Id]
          return (
            <div key={m.id} className={styles.matchRow}>
              <div className={styles.matchPlayers}>
                <Body1 className={m.result?.winner === 'player1' ? styles.resultWinner : ''}>{p1?.name ?? '?'}</Body1>
                <Caption1 className={styles.matchVs}>vs</Caption1>
                <Body1 className={m.result?.winner === 'player2' ? styles.resultWinner : ''}>{p2?.name ?? '?'}</Body1>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Caption1>{m.result.winner === 'draw' ? 'Draw' : m.result.winner === 'player1' ? `${p1?.name} wins` : `${p2?.name} wins`}</Caption1>
                {onDelete && (
                  <Button appearance="subtle" size="small" icon={<DismissRegular />} aria-label="Delete result" onClick={() => onDelete(m.id)} />
                )}
              </span>
            </div>
          )
        })
      )}
    </>
  )
}

function GroupsView({ tournament, playerById, onResult, onClear, groupLabel = (g) => `Group ${g}` }) {
  const styles = useStyles()
  return (
    <>
      {GK.groupNames(tournament.matches).map(g => (
        <div key={g} className={styles.roundSection}>
          <Title3 style={{ display: 'block', marginBottom: '12px' }}>{groupLabel(g)}</Title3>
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px' }}>
              <RoundRobinView
                matches={GK.groupMatches(tournament.matches, g)}
                playerById={playerById}
                onResult={onResult}
                onClear={onClear}
              />
            </div>
            <div style={{ flex: '0 1 420px' }}>
              <StandingsView
                players={GK.groupPlayers(tournament.players, tournament.matches, g)}
                matches={GK.groupMatches(tournament.matches, g)}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function BracketView({ matches, playerById, onResult, onClear }) {
  const styles = useStyles()
  if (!matches.length) return null

  const maxRound = Math.max(...matches.map(m => m.round))
  const rounds = {}
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  }

  return (
    <div className={styles.bracket}>
      {Array.from({ length: maxRound }, (_, i) => i + 1).map(r => {
        const roundMatches = rounds[r].sort((a, b) => a.position - b.position)
        return (
          <div key={r} className={styles.bracketRound}>
            <Caption1 className={styles.bracketRoundLabel}>{roundLabel(r, maxRound)}</Caption1>
            <div className={styles.bracketMatches}>
              {roundMatches.map(m => {
                const p1 = m.player1Id ? playerById[m.player1Id] : null
                const p2 = m.player2Id ? playerById[m.player2Id] : null
                const winnerId = m.result?.winnerId
                const canEnter = !m.result && p1 && p2 && onResult

                return (
                  <div key={m.id} className={styles.bracketSlot}>
                    <div className={styles.bracketCard}>
                      {[{ p: p1, side: 0 }, { p: p2, side: 1 }].map(({ p, side }) => {
                        const isWinner = p && p.id === winnerId
                        const isElim = winnerId && p && p.id !== winnerId
                        return (
                          <div
                            key={side}
                            className={`${styles.bracketPlayer} ${isWinner ? styles.bracketPlayerWinner : ''} ${isElim ? styles.bracketPlayerElim : ''}`}
                          >
                            <Body1>{p?.name ?? 'TBD'}</Body1>
                            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {m.result?.score && <Caption1>{m.result.score[side]}</Caption1>}
                              {isWinner && <Caption1>🏆</Caption1>}
                            </span>
                          </div>
                        )
                      })}
                      {canEnter && (
                        <div style={{ display: 'flex', padding: '4px', gap: '4px', backgroundColor: tokens.colorNeutralBackground2, alignItems: 'center' }}>
                          <Button size="small" style={{ flex: 1 }} onClick={() => onResult(m.id, { winnerId: p1.id })}>{p1.name}</Button>
                          <Button size="small" style={{ flex: 1 }} onClick={() => onResult(m.id, { winnerId: p2.id })}>{p2.name}</Button>
                          <ScorePopover
                            p1Name={p1.name}
                            p2Name={p2.name}
                            allowDraw={false}
                            onSave={(score) => onResult(m.id, { winnerId: score[0] > score[1] ? p1.id : p2.id, score })}
                          />
                        </div>
                      )}
                      {m.result && onClear && p1 && p2 && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px', backgroundColor: tokens.colorNeutralBackground2 }}>
                          <Button appearance="subtle" size="small" icon={<DismissRegular />} onClick={() => onClear(m.id)}>Clear</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShareDialog({ open, onClose, tournament }) {
  const [qr, setQr] = useState(null)
  const url = `${window.location.origin}${import.meta.env.BASE_URL}tournaments/${tournament.id}#report`

  useEffect(() => {
    if (open) QRCode.toDataURL(url, { width: 280, margin: 2 }).then(setQr)
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={(_, { open }) => !open && onClose()}>
      <DialogSurface style={{ maxWidth: '360px' }}>
        <DialogBody>
          <DialogTitle>{tournament.name}</DialogTitle>
          <DialogContent>
            <div style={{ textAlign: 'center' }}>
              {qr && <img src={qr} alt={`QR code linking to ${tournament.name}`} style={{ width: '280px', maxWidth: '100%' }} />}
              <Caption1 style={{ display: 'block', marginTop: '4px' }}>
                Scan to open this tournament and report results. You&rsquo;ll need the PIN from the host.
              </Caption1>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export default function TournamentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const styles = useStyles()

  const [tournament, setTournament] = useState(() => {
    const t = getTournaments().find(t => t.id === id)
    return t ? { players: [], matches: [], ...t } : null
  })
  const [games] = useState(getGames)
  const [selectedTab, setSelectedTab] = useState('players')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  // #report deep link (from the QR): open the PIN unlock if this browser can't report yet
  const [unlockOpen, setUnlockOpen] = useState(() =>
    window.location.hash === '#report' && Boolean(getAccess()) && !getPublishSettings().token
  )

  if (!tournament) {
    return <Body1>Tournament not found.</Body1>
  }

  function save(updated) {
    saveTournament(updated)
    setTournament(updated)
  }

  function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    save({ ...tournament, players: [...tournament.players, { id: crypto.randomUUID(), name }] })
    setNewPlayerName('')
  }

  function removePlayer(playerId) {
    save({ ...tournament, players: tournament.players.filter(p => p.id !== playerId) })
  }

  function start() {
    const { format, players } = tournament
    const matches =
      format === 'single-elimination' ? SE.generate(players)
      : format === 'swiss' ? SW.generateNextRound(players, [])
      : format === 'leaderboard' ? []
      : format === 'group-knockout' ? GK.generateGroups(players)
      : format === 'season-playoffs' ? SP.generateSeason(players)
      : format === 'conference-finals' ? CF.generateConferences(players)
      : RR.generate(players)
    save({ ...tournament, status: 'active', matches })
    setSelectedTab(
      format === 'single-elimination' ? 'bracket'
      : format === 'group-knockout' || format === 'conference-finals' ? 'groups'
      : 'matches'
    )
  }

  function advanceToKnockout() {
    const { format, players, matches } = tournament
    const updated =
      format === 'group-knockout' ? GK.generateKnockout(players, matches)
      : format === 'season-playoffs' ? SP.generatePlayoffs(players, matches)
      : CF.generateFinals(players, matches)
    save({ ...tournament, matches: updated })
    setSelectedTab('bracket')
  }

  function generateNextSwissRound() {
    save({ ...tournament, matches: SW.generateNextRound(tournament.players, tournament.matches) })
  }

  function handleLeaderboardRecord(player1Id, player2Id, result) {
    const match = { id: crypto.randomUUID(), round: 1, player1Id, player2Id, result }
    save({ ...tournament, matches: [...tournament.matches, match] })
  }

  function finish() {
    save({ ...tournament, status: 'completed' })
  }

  function reopen() {
    save({ ...tournament, status: 'active' })
  }

  function movePlayer(index, delta) {
    const players = [...tournament.players]
    const target = index + delta
    if (target < 0 || target >= players.length) return
    ;[players[index], players[target]] = [players[target], players[index]]
    save({ ...tournament, players })
  }

  function handleRRResult(matchId, result) {
    const matches = tournament.matches.map(m => m.id === matchId ? { ...m, result } : m)
    save({ ...tournament, matches })
  }

  function handleSEResult(matchId, result) {
    const updated = tournament.matches.map(m => m.id === matchId ? { ...m, result } : m)
    save({ ...tournament, matches: SE.advanceWinners(updated) })
  }

  // Knockout results in group-knockout: advance winners within the knockout subset only.
  function handleKOResult(matchId, result) {
    const updated = tournament.matches.map(m => m.id === matchId ? { ...m, result } : m)
    const ko = SE.advanceWinners(updated.filter(m => m.phase === 'knockout'))
    save({ ...tournament, matches: [...updated.filter(m => m.phase !== 'knockout'), ...ko] })
  }

  function handleClear(matchId) {
    save({ ...tournament, matches: tournament.matches.map(m => m.id === matchId ? { ...m, result: null } : m) })
  }

  function handleSEClear(matchId) {
    save({ ...tournament, matches: SE.clearResult(tournament.matches, matchId) })
  }

  function handleKOClear(matchId) {
    const ko = SE.clearResult(tournament.matches.filter(m => m.phase === 'knockout'), matchId)
    save({ ...tournament, matches: [...tournament.matches.filter(m => m.phase !== 'knockout'), ...ko] })
  }

  function handleLBDelete(matchId) {
    save({ ...tournament, matches: tournament.matches.filter(m => m.id !== matchId) })
  }

  const game = games.find(g => g.id === tournament.gameId)
  const formatLabel = FORMATS.find(f => f.value === tournament.format)?.label ?? tournament.format
  const playerById = Object.fromEntries(tournament.players.map(p => [p.id, p]))
  const { format } = tournament
  const isBracket = format === 'single-elimination'
  const isSwiss = format === 'swiss'
  const isLeaderboard = format === 'leaderboard'
  const isGK = format === 'group-knockout'
  const isSP = format === 'season-playoffs'
  const isCF = format === 'conference-finals'
  const isGrouped = isGK || isCF
  const hasStandings = !isBracket && !isGrouped
  const minPlayers = isGK ? GK.MIN_PLAYERS : isSP ? SP.MIN_PLAYERS : isCF ? CF.MIN_PLAYERS : 2
  const complete =
    isBracket ? SE.isComplete(tournament.matches)
    : isSwiss ? SW.isComplete(tournament.players, tournament.matches)
    : isLeaderboard ? tournament.matches.length > 0
    : isGK || isCF ? GK.isComplete(tournament.matches)
    : isSP ? SP.isComplete(tournament.matches)
    : RR.isComplete(tournament.matches)
  const swissCanAdvance = isSwiss
    && tournament.status === 'active'
    && SW.currentRound(tournament.matches) < SW.totalRounds(tournament.players.length)
    && SW.roundComplete(tournament.matches, SW.currentRound(tournament.matches))
  const knockoutHasStarted =
    isGK || isCF ? GK.knockoutStarted(tournament.matches)
    : isSP ? SP.playoffsStarted(tournament.matches)
    : false
  const phaseCanAdvance = tournament.status === 'active' && !knockoutHasStarted && (
    (isGK || isCF) ? GK.groupsComplete(tournament.matches)
    : isSP ? SP.seasonComplete(tournament.matches)
    : false
  )
  const advanceLabel = isGK ? 'Advance to knockout' : isSP ? 'Start playoffs' : 'Start finals'

  return (
    <>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ChevronLeftRegular />}
          onClick={() => navigate('/')}
        />
        <div className={styles.headerText}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Title2>{tournament.name}</Title2>
            <Badge appearance="tint" color={STATUS_APPEARANCE[tournament.status]}>{tournament.status}</Badge>
          </div>
          <div className={styles.headerMeta}>
            <Caption1>{game?.name ?? '—'}</Caption1>
            <Caption1>·</Caption1>
            <Caption1>{formatLabel}</Caption1>
            <Caption1>·</Caption1>
            <Caption1>{tournament.startDate} → {tournament.endDate}</Caption1>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button appearance="subtle" icon={<QrCodeRegular />} aria-label="Share QR" onClick={() => setShareOpen(true)} />
          {tournament.status === 'upcoming' && tournament.players.length >= minPlayers && (
            <Button appearance="primary" onClick={start}>Start tournament</Button>
          )}
          {phaseCanAdvance && (
            <Button appearance="primary" onClick={advanceToKnockout}>{advanceLabel}</Button>
          )}
          {tournament.status === 'active' && complete && (
            <Button appearance="primary" onClick={finish}>Finish tournament</Button>
          )}
          {tournament.status === 'completed' && (
            <Button appearance="secondary" onClick={reopen}>Reopen</Button>
          )}
        </div>
      </div>

      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, { value }) => setSelectedTab(value)}
      >
        <Tab value="players">Players {tournament.players.length > 0 ? `(${tournament.players.length})` : ''}</Tab>
        {tournament.status !== 'upcoming' && !isBracket && !isGrouped && <Tab value="matches">{isLeaderboard ? 'Results' : isSP ? 'Season' : 'Matches'}</Tab>}
        {tournament.status !== 'upcoming' && hasStandings && <Tab value="standings">Standings</Tab>}
        {tournament.status !== 'upcoming' && isGrouped && <Tab value="groups">{isCF ? 'Conferences' : 'Groups'}</Tab>}
        {tournament.status !== 'upcoming' && (isBracket || knockoutHasStarted) && (
          <Tab value="bracket">{isSP ? 'Playoffs' : isCF ? 'Finals' : 'Bracket'}</Tab>
        )}
      </TabList>

      <div className={styles.tabContent}>
        {selectedTab === 'players' && (
          <>
            {tournament.status === 'upcoming' && (
              <div className={styles.rosterAdd}>
                <Field label="Add player">
                  <Input
                    placeholder="Player name"
                    value={newPlayerName}
                    onChange={(_, { value }) => setNewPlayerName(value)}
                    onKeyDown={e => e.key === 'Enter' && addPlayer()}
                    style={{ width: '240px' }}
                  />
                </Field>
                <Button icon={<AddRegular />} onClick={addPlayer} disabled={!newPlayerName.trim()}>Add</Button>
              </div>
            )}
            {tournament.players.length === 0 ? (
              <Body1>No players yet{tournament.status === 'upcoming' ? ' — add some above.' : '.'}</Body1>
            ) : (
              <Table style={{ maxWidth: '400px' }}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    {tournament.status === 'upcoming' && <TableHeaderCell />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament.players.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      {tournament.status === 'upcoming' && (
                        <TableCellActions>
                          <Button appearance="subtle" icon={<ArrowUpRegular />} aria-label="Move up" disabled={i === 0} onClick={() => movePlayer(i, -1)} />
                          <Button appearance="subtle" icon={<ArrowDownRegular />} aria-label="Move down" disabled={i === tournament.players.length - 1} onClick={() => movePlayer(i, 1)} />
                          <Button appearance="subtle" icon={<DeleteRegular />} aria-label="Remove" onClick={() => removePlayer(p.id)} />
                        </TableCellActions>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {tournament.status === 'upcoming' && tournament.players.length >= 2 && (
              <Caption1 style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '12px' }}>
                Order matters: it sets bracket seeding and group/conference assignment.
              </Caption1>
            )}
            {tournament.status === 'upcoming' && tournament.players.length < minPlayers && (
              <Caption1 style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '12px' }}>
                Add at least {minPlayers} players to start.
              </Caption1>
            )}
          </>
        )}

        {selectedTab === 'matches' && isLeaderboard && (
          <LeaderboardView
            tournament={tournament}
            playerById={playerById}
            onRecord={handleLeaderboardRecord}
            onDelete={tournament.status === 'active' ? handleLBDelete : undefined}
          />
        )}

        {selectedTab === 'matches' && !isLeaderboard && (
          <>
            <RoundRobinView
              matches={isSP ? SP.seasonMatches(tournament.matches) : tournament.matches}
              playerById={playerById}
              onResult={tournament.status === 'active' ? handleRRResult : undefined}
              onClear={tournament.status === 'active' && !knockoutHasStarted ? handleClear : undefined}
            />
            {swissCanAdvance && (
              <Button appearance="primary" onClick={generateNextSwissRound}>
                Generate round {SW.currentRound(tournament.matches) + 1} of {SW.totalRounds(tournament.players.length)}
              </Button>
            )}
          </>
        )}

        {selectedTab === 'standings' && (
          <StandingsView
            players={tournament.players}
            matches={isSP ? SP.seasonMatches(tournament.matches) : tournament.matches}
          />
        )}

        {selectedTab === 'groups' && (
          <GroupsView
            tournament={tournament}
            playerById={playerById}
            onResult={tournament.status === 'active' ? handleRRResult : undefined}
            onClear={tournament.status === 'active' && !knockoutHasStarted ? handleClear : undefined}
            groupLabel={isCF ? (g) => `${g} Conference` : undefined}
          />
        )}

        {selectedTab === 'bracket' && (
          <BracketView
            matches={isBracket ? tournament.matches : GK.knockoutMatches(tournament.matches)}
            playerById={playerById}
            onResult={tournament.status === 'active' ? (isBracket ? handleSEResult : handleKOResult) : undefined}
            onClear={tournament.status === 'active' ? (isBracket ? handleSEClear : handleKOClear) : undefined}
          />
        )}
      </div>

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} tournament={tournament} />
      <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} />
    </>
  )
}
