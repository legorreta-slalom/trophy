import { useState } from 'react'
import {
  makeStyles,
  Title2, Body1, Body1Strong, Caption1,
  Dropdown, Option, Field,
  Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell,
} from '@fluentui/react-components'
import { getTournaments, getGames } from '../store.js'
import { getChampion } from '../engines/champion.js'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  table: { maxWidth: '640px' },
})

// Players are matched by name across tournaments (case-insensitive) —
// rosters are per-tournament, there is no global player entity.
function aggregate(tournaments) {
  const stats = new Map()
  for (const t of tournaments) {
    const champion = getChampion(t)
    for (const p of t.players ?? []) {
      const key = p.name.trim().toLowerCase()
      if (!stats.has(key)) stats.set(key, { name: p.name.trim(), played: 0, titles: 0 })
      const s = stats.get(key)
      s.played++
      if (champion && champion.id === p.id) s.titles++
    }
  }
  return [...stats.values()].sort((a, b) =>
    b.titles - a.titles || b.played - a.played || a.name.localeCompare(b.name)
  )
}

export default function HallOfFame() {
  const styles = useStyles()
  const [gameId, setGameId] = useState('')
  const games = getGames()

  const completed = getTournaments().filter(t =>
    t.status === 'completed' && (!gameId || t.gameId === gameId)
  )
  const rows = aggregate(completed)

  return (
    <>
      <div className={styles.header}>
        <Title2>Hall of Fame</Title2>
        <Field label="Game" orientation="horizontal">
          <Dropdown
            placeholder="All games"
            value={games.find(g => g.id === gameId)?.name ?? 'All games'}
            selectedOptions={[gameId]}
            onOptionSelect={(_, { optionValue }) => setGameId(optionValue)}
            style={{ minWidth: '160px' }}
          >
            <Option value="">All games</Option>
            {games.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
          </Dropdown>
        </Field>
      </div>

      {rows.length === 0 ? (
        <Body1>No completed tournaments yet — legends are made one game at a time.</Body1>
      ) : (
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell style={{ width: '32px' }}>#</TableHeaderCell>
              <TableHeaderCell>Player</TableHeaderCell>
              <TableHeaderCell>Championships</TableHeaderCell>
              <TableHeaderCell>Tournaments</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.name}>
                <TableCell>{i + 1}</TableCell>
                <TableCell><Body1Strong>{r.name}</Body1Strong></TableCell>
                <TableCell>
                  {r.titles > 0
                    ? <Body1Strong>{'🏆'.repeat(Math.min(r.titles, 5))}{r.titles > 5 ? ` ×${r.titles}` : ''}</Body1Strong>
                    : <Caption1>—</Caption1>}
                </TableCell>
                <TableCell>{r.played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
