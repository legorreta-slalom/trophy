import { useParams, useNavigate } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title2, Title3, Body1, Body1Strong, Caption1,
  Avatar, Button,
  Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell,
} from '@fluentui/react-components'
import { ChevronLeftRegular } from '@fluentui/react-icons'
import { getTournaments, getGames } from '../store.js'
import { getChampion } from '../engines/champion.js'
import { computeElo, eloFor } from '../engines/elo.js'

const useStyles = makeStyles({
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  statRow: { display: 'flex', gap: '32px', marginBottom: '28px', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column' },
  statValue: { fontSize: '28px', fontWeight: 700 },
  section: { marginBottom: '28px' },
  table: { maxWidth: '560px' },
})

// Everything derives from tournament data at render; players are matched
// across tournaments by case-insensitive name.
function aggregate(name) {
  const key = name.toLowerCase()
  const tournaments = getTournaments()
  const games = getGames()
  let image = null
  let titles = 0
  const perGame = new Map() // gameId -> {w, d, l}
  const h2h = new Map() // opponent name -> {w, d, l}
  const recent = []

  for (const t of [...tournaments].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))) {
    const me = t.players?.find(p => p.name.trim().toLowerCase() === key)
    if (!me) continue
    image ??= me.image ?? null
    if (t.status === 'completed' && getChampion(t)?.id === me.id) titles++

    const nameOf = (id) => t.players.find(p => p.id === id)?.name
    for (const m of t.matches ?? []) {
      if (!m.result || m.pendingEntry || m.order) continue
      if (m.player1Id !== me.id && m.player2Id !== me.id) continue
      const opponent = nameOf(m.player1Id === me.id ? m.player2Id : m.player1Id)
      if (!opponent) continue
      const won = m.result.winnerId ? m.result.winnerId === me.id
        : m.result.winner === (m.player1Id === me.id ? 'player1' : 'player2')
      const draw = m.result.winner === 'draw'
      const bump = (map, k) => {
        if (!map.has(k)) map.set(k, { w: 0, d: 0, l: 0 })
        const s = map.get(k)
        if (draw) s.d++; else if (won) s.w++; else s.l++
      }
      bump(perGame, t.gameId)
      bump(h2h, opponent)
      recent.push({ outcome: draw ? 'D' : won ? 'W' : 'L', opponent, tournament: t.name })
    }
  }

  return {
    image, titles, recent: recent.slice(-10).reverse(),
    perGame: [...perGame.entries()].map(([gameId, s]) => ({ game: games.find(g => g.id === gameId)?.name ?? '—', ...s })),
    h2h: [...h2h.entries()].map(([opponent, s]) => ({ opponent, ...s }))
      .sort((a, b) => (b.w + b.d + b.l) - (a.w + a.d + a.l)).slice(0, 10),
  }
}

export default function PlayerProfile() {
  const { name } = useParams()
  const navigate = useNavigate()
  const styles = useStyles()

  const stats = aggregate(name)
  const elo = eloFor(computeElo(getTournaments()), name)
  const totals = stats.perGame.reduce((a, g) => ({ w: a.w + g.w, d: a.d + g.d, l: a.l + g.l }), { w: 0, d: 0, l: 0 })

  return (
    <>
      <div className={styles.header}>
        <Button appearance="subtle" icon={<ChevronLeftRegular />} onClick={() => navigate(-1)} />
        <Avatar name={name} color="colorful" size={72} image={stats.image ? { src: stats.image } : undefined} />
        <Title2>{name}</Title2>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{'🏆'.repeat(Math.min(stats.titles, 5)) || '—'}</span>
          <Caption1>{stats.titles} championship{stats.titles === 1 ? '' : 's'}</Caption1>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.w}-{totals.d}-{totals.l}</span>
          <Caption1>All-time W-D-L</Caption1>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{elo ? Math.round(elo.rating) : '—'}</span>
          <Caption1>Elo ({elo?.games ?? 0} games)</Caption1>
        </div>
      </div>

      {stats.perGame.length > 0 && (
        <div className={styles.section}>
          <Title3 style={{ display: 'block', marginBottom: '8px' }}>By game</Title3>
          <Table className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Game</TableHeaderCell>
                <TableHeaderCell>W</TableHeaderCell>
                <TableHeaderCell>D</TableHeaderCell>
                <TableHeaderCell>L</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.perGame.map(g => (
                <TableRow key={g.game}>
                  <TableCell><Body1Strong>{g.game}</Body1Strong></TableCell>
                  <TableCell>{g.w}</TableCell>
                  <TableCell>{g.d}</TableCell>
                  <TableCell>{g.l}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {stats.h2h.length > 0 && (
        <div className={styles.section}>
          <Title3 style={{ display: 'block', marginBottom: '8px' }}>Head-to-head</Title3>
          <Table className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Opponent</TableHeaderCell>
                <TableHeaderCell>W</TableHeaderCell>
                <TableHeaderCell>D</TableHeaderCell>
                <TableHeaderCell>L</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.h2h.map(r => (
                <TableRow key={r.opponent} onClick={() => navigate(`/players/${encodeURIComponent(r.opponent)}`)} style={{ cursor: 'pointer' }}>
                  <TableCell>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar name={r.opponent} color="colorful" size={24} />
                      <Body1Strong>{r.opponent}</Body1Strong>
                    </span>
                  </TableCell>
                  <TableCell>{r.w}</TableCell>
                  <TableCell>{r.d}</TableCell>
                  <TableCell>{r.l}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {stats.recent.length > 0 && (
        <div className={styles.section}>
          <Title3 style={{ display: 'block', marginBottom: '8px' }}>Recent results</Title3>
          {stats.recent.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '4px 0', alignItems: 'baseline' }}>
              <Body1Strong style={{ color: r.outcome === 'W' ? tokens.colorPaletteGreenForeground1 : r.outcome === 'L' ? tokens.colorPaletteRedForeground1 : tokens.colorNeutralForeground3 }}>
                {r.outcome}
              </Body1Strong>
              <Body1>vs {r.opponent}</Body1>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{r.tournament}</Caption1>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
