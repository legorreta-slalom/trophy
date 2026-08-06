import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { makeStyles, tokens, Avatar, Badge } from '@fluentui/react-components'
import { getTournaments, getGames } from '../store.js'
import { STATUS_APPEARANCE } from '../constants.js'
import * as RR from '../engines/roundRobin.js'
import * as Racing from '../engines/racing.js'
import * as SP from '../engines/seasonPlayoffs.js'
import { pullPublished } from '../hydrate.js'

const ROTATE_MS = 15_000
const REFRESH_MS = 120_000

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '48px 64px',
    fontSize: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '32px',
  },
  title: { fontSize: '44px', fontWeight: 700, margin: 0 },
  table: { width: '100%', maxWidth: '900px', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: '20px',
    color: tokens.colorNeutralForeground3,
    padding: '8px 16px',
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  td: {
    fontSize: '28px',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  upNext: { marginTop: '40px' },
  upNextTitle: { fontSize: '24px', color: tokens.colorNeutralForeground3, marginBottom: '12px' },
  match: { fontSize: '26px', padding: '6px 0' },
  dots: { position: 'fixed', bottom: '24px', display: 'flex', gap: '8px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tokens.colorNeutralStroke1 },
  dotActive: { backgroundColor: tokens.colorBrandForeground1 },
})

function standingsFor(t) {
  if (t.format === 'racing') {
    return Racing.computeStandings(t.players, t.matches, t.positionPoints ?? null)
      .map(r => ({ ...r, detail: `${r.wins} wins` }))
  }
  const matches = t.format === 'season-playoffs' ? SP.seasonMatches(t.matches) : t.matches
  return RR.computeStandings(t.players, matches, t.points)
    .map(r => ({ ...r, detail: `${r.w}-${r.d}-${r.l}` }))
}

function upNext(t, playerById) {
  return t.matches
    .filter(m => !m.result && !m.pendingEntry && m.player1Id && m.player2Id && m.order === undefined)
    .slice(0, 4)
    .map(m => `${playerById[m.player1Id]?.name ?? '?'} vs ${playerById[m.player2Id]?.name ?? '?'}`)
}

export default function Kiosk() {
  const styles = useStyles()
  const [params] = useSearchParams()
  const pinned = params.get('t')
  const [index, setIndex] = useState(0)
  const [, setTick] = useState(0)

  useEffect(() => {
    const rotate = setInterval(() => setIndex(i => i + 1), ROTATE_MS)
    const refresh = setInterval(() => {
      pullPublished().then(() => setTick(n => n + 1)).catch(() => {})
    }, REFRESH_MS)
    return () => { clearInterval(rotate); clearInterval(refresh) }
  }, [])

  const games = getGames()
  const active = getTournaments().filter(t => pinned ? t.id === pinned : t.status === 'active')
  if (!active.length) return <div className={styles.root}><h1 className={styles.title}>No active tournaments</h1></div>

  const t = active[index % active.length]
  const game = games.find(g => g.id === t.gameId)
  const playerById = Object.fromEntries(t.players.map(p => [p.id, p]))
  const rows = standingsFor(t).slice(0, 8)
  const next = upNext(t, playerById)

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Avatar name={t.name} color="colorful" shape="square" size={72} image={t.image ? { src: t.image } : undefined} />
        <div>
          <h1 className={styles.title}>{t.name}</h1>
          <Badge appearance="tint" color={STATUS_APPEARANCE[t.status]} size="large">{game?.name ?? ''} · {t.status}</Badge>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>#</th>
            <th className={styles.th}>Player</th>
            <th className={styles.th}>Record</th>
            <th className={styles.th}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className={styles.td}>{i + 1}</td>
              <td className={styles.td}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                  <Avatar name={r.name} color="colorful" size={40} image={r.image ? { src: r.image } : undefined} />
                  {r.name}
                </span>
              </td>
              <td className={styles.td}>{r.detail}</td>
              <td className={styles.td} style={{ fontWeight: 700 }}>{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {next.length > 0 && (
        <div className={styles.upNext}>
          <div className={styles.upNextTitle}>Up next</div>
          {next.map((line, i) => <div key={i} className={styles.match}>{line}</div>)}
        </div>
      )}

      {active.length > 1 && (
        <div className={styles.dots}>
          {active.map((x, i) => (
            <div key={x.id} className={`${styles.dot} ${i === index % active.length ? styles.dotActive : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}
