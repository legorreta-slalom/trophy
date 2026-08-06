import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title2, Body1, Body1Strong, Caption1,
  Button, Input, Field,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, DialogTrigger,
  Combobox, Option,
  Dropdown,
  Card, CardHeader,
  Badge, Avatar, Switch,
} from '@fluentui/react-components'
import { AddRegular, DeleteRegular, EditRegular } from '@fluentui/react-icons'
import { getTournaments, saveTournament, deleteTournament, getGames, saveGame } from '../store.js'
import { FORMATS, STATUS_APPEARANCE } from '../constants.js'
import { getChampion } from '../engines/champion.js'
import { POSITION_PRESETS } from '../engines/racing.js'
import ImagePicker from '../components/ImagePicker.jsx'

function computeStatus(startDate, endDate) {
  const today = new Date().toISOString().slice(0, 10)
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'completed'
  return 'active'
}

const EMPTY_FORM = {
  name: '', gameId: '', gameInput: '', format: 'round-robin',
  startDate: '', endDate: '', image: null,
  points: { win: 3, draw: 1, loss: 0 },
  positionPreset: 'linear', customTable: '',
  bestOf: 1,
  teams: false,
  streamUrl: '',
}

const BRACKET_FORMATS = ['single-elimination', 'double-elimination', 'group-knockout', 'season-playoffs', 'conference-finals']

function presetFromTable(table) {
  if (!table) return 'linear'
  const match = Object.entries(POSITION_PRESETS).find(([, p]) => JSON.stringify(p.table) === JSON.stringify(table))
  return match ? match[0] : 'custom'
}

const useStyles = makeStyles({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '4px',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '4px',
    marginTop: '8px',
  },
  formField: { marginBottom: '12px' },
  dateRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    cursor: 'pointer',
  },
})

export default function Tournaments() {
  const styles = useStyles()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState(getTournaments)
  const [games, setGames] = useState(getGames)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState(null)

  function refresh() {
    setTournaments(getTournaments())
    setGames(getGames())
  }

  function openNew() { setEditing({}); setForm(EMPTY_FORM) }

  function openEdit(e, t) {
    e.stopPropagation()
    const game = games.find(g => g.id === t.gameId)
    setEditing(t)
    setForm({
      name: t.name, gameId: t.gameId, gameInput: game?.name ?? '', format: t.format,
      startDate: t.startDate, endDate: t.endDate, image: t.image ?? null,
      points: t.points ?? { win: 3, draw: 1, loss: 0 },
      positionPreset: presetFromTable(t.positionPoints),
      customTable: t.positionPoints?.join(', ') ?? '',
      bestOf: t.bestOf ?? 1,
      teams: t.teams ?? false,
      streamUrl: t.streamUrl ?? '',
    })
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleGameSelect(_, data) {
    if (data.optionValue === '__new__') {
      const newGame = { id: crypto.randomUUID(), name: form.gameInput.trim() }
      saveGame(newGame)
      setGames(getGames())
      setForm(f => ({ ...f, gameId: newGame.id, gameInput: newGame.name }))
    } else {
      setForm(f => ({ ...f, gameId: data.optionValue, gameInput: data.optionText ?? '' }))
    }
  }

  function save() {
    const existing = editing.id ? getTournaments().find(t => t.id === editing.id) : null
    // Preserve status/players/matches for started tournaments; only recompute status for upcoming
    const status = existing?.status === 'active' || existing?.status === 'completed'
      ? existing.status
      : computeStatus(form.startDate, form.endDate)
    saveTournament({
      ...(existing ?? {}),
      id: editing.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      gameId: form.gameId,
      format: form.format,
      startDate: form.startDate,
      endDate: form.endDate,
      image: form.image,
      points: form.points,
      teams: form.teams,
      streamUrl: form.streamUrl.trim() || null,
      bestOf: BRACKET_FORMATS.includes(form.format) ? form.bestOf : 1,
      positionPoints: form.format !== 'racing' ? null
        : form.positionPreset === 'custom'
          ? form.customTable.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
          : POSITION_PRESETS[form.positionPreset].table,
      status,
    })
    refresh()
    setEditing(null)
  }

  function confirmDelete() {
    deleteTournament(pendingDelete.id)
    refresh()
    setPendingDelete(null)
  }

  const today = new Date().toDateString()
  const todayMatches = tournaments.flatMap(t =>
    (t.matches ?? [])
      .filter(m => m.scheduledAt && !m.result && new Date(m.scheduledAt).toDateString() === today)
      .map(m => {
        const name = (id) => t.players?.find(p => p.id === id)?.name ?? '?'
        return { t, m, label: `${name(m.player1Id)} vs ${name(m.player2Id)}` }
      })
  ).sort((a, b) => a.m.scheduledAt.localeCompare(b.m.scheduledAt))

  const formValid = form.name.trim() && form.gameId && form.format && form.startDate && form.endDate
  const filteredGames = games.filter(g => g.name.toLowerCase().includes(form.gameInput.toLowerCase()))
  const showAddNew = form.gameInput.trim() &&
    !games.some(g => g.name.toLowerCase() === form.gameInput.trim().toLowerCase())

  function renderCard(t) {
    const game = games.find(g => g.id === t.gameId)
    const formatLabel = FORMATS.find(f => f.value === t.format)?.label ?? t.format
    const champion = t.status === 'completed' ? getChampion(t) : null
    return (
      <Card key={t.id} appearance="outline" onClick={() => navigate(`/tournaments/${t.id}`)} style={{ cursor: 'pointer' }}>
        <CardHeader
          image={<Avatar name={t.name} color="colorful" shape="square" size={40} image={t.image ? { src: t.image } : undefined} />}
          header={<Body1Strong>{t.name}</Body1Strong>}
          action={<Badge appearance="tint" color={STATUS_APPEARANCE[t.status]}>{t.status}</Badge>}
        />
        <div className={styles.cardMeta}>
          <Caption1>{game?.name ?? '—'} · {formatLabel}</Caption1>
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
            {t.startDate} → {t.endDate}
          </Caption1>
          {champion && <Body1Strong>🏆 {champion.name}</Body1Strong>}
        </div>
        <div className={styles.cardActions}>
          <Button
            appearance="subtle"
            icon={<EditRegular />}
            aria-label="Edit"
            disabled={t.status !== 'upcoming'}
            onClick={e => openEdit(e, t)}
          />
          <Button
            appearance="subtle"
            icon={<DeleteRegular />}
            aria-label="Delete"
            onClick={e => { e.stopPropagation(); setPendingDelete(t) }}
          />
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className={styles.header}>
        <Title2>Tournaments</Title2>
        <Button appearance="primary" icon={<AddRegular />} onClick={openNew}>New tournament</Button>
      </div>

      {todayMatches.length > 0 && (
        <>
          <Title2 style={{ display: 'block', margin: '0 0 12px', fontSize: '20px' }}>Today</Title2>
          <div style={{ marginBottom: '24px' }}>
            {todayMatches.map(({ t, m, label }) => (
              <div
                key={m.id}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '6px 0', cursor: 'pointer' }}
              >
                <Body1Strong>{new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Body1Strong>
                <Body1>{label}</Body1>
                <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>{t.name}</Caption1>
              </div>
            ))}
          </div>
        </>
      )}

      {tournaments.length === 0 ? (
        <Body1>No tournaments yet. Create one to get started.</Body1>
      ) : (
        <>
          <div className={styles.grid}>
            {tournaments.filter(t => t.status !== 'completed').map(t => renderCard(t))}
          </div>
          {tournaments.some(t => t.status === 'completed') && (
            <>
              <Title2 style={{ display: 'block', margin: '32px 0 16px' }}>Archive</Title2>
              <div className={styles.grid}>
                {tournaments.filter(t => t.status === 'completed').map(t => renderCard(t))}
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(_, { open }) => !open && setEditing(null)}>
        <DialogSurface style={{ maxWidth: '480px' }}>
          <DialogBody>
            <DialogTitle>{editing?.id ? 'Edit tournament' : 'New tournament'}</DialogTitle>
            <DialogContent>
              <div className={styles.formField}>
                <Field label="Name" required>
                  <Input autoFocus value={form.name} onChange={(_, { value }) => set('name', value)} />
                </Field>
              </div>
              <div className={styles.formField}>
                <Field label="Game" required>
                  <Combobox
                    freeform
                    placeholder="Search or add a game…"
                    value={form.gameInput}
                    selectedOptions={form.gameId ? [form.gameId] : []}
                    onChange={e => set('gameInput', e.target.value)}
                    onOptionSelect={handleGameSelect}
                  >
                    {filteredGames.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                    {showAddNew && (
                      <Option value="__new__">Add &ldquo;{form.gameInput.trim()}&rdquo; as new game</Option>
                    )}
                  </Combobox>
                </Field>
              </div>
              <div className={styles.formField}>
                <Field label="Format" required>
                  <Dropdown
                    value={FORMATS.find(f => f.value === form.format)?.label ?? ''}
                    selectedOptions={[form.format]}
                    onOptionSelect={(_, { optionValue }) => set('format', optionValue)}
                  >
                    {FORMATS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                  </Dropdown>
                </Field>
              </div>
              <div className={styles.dateRow}>
                <Field label="Start date" required>
                  <Input type="date" value={form.startDate} onChange={(_, { value }) => set('startDate', value)} />
                </Field>
                <Field label="End date" required>
                  <Input type="date" value={form.endDate} onChange={(_, { value }) => set('endDate', value)} />
                </Field>
              </div>
              {!['single-elimination', 'double-elimination', 'racing'].includes(form.format) && (
                <div className={styles.formField}>
                  <Field label="Points (win / draw / loss)">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['win', 'draw', 'loss'].map(k => (
                        <Input
                          key={k}
                          type="number"
                          aria-label={`${k} points`}
                          value={String(form.points[k])}
                          onChange={(_, { value }) => set('points', { ...form.points, [k]: Number(value) || 0 })}
                          style={{ width: '72px' }}
                        />
                      ))}
                    </div>
                  </Field>
                </div>
              )}
              <div className={styles.formField}>
                <Field label="Stream / watch link" hint="Optional. Teams call, Twitch, a webcam URL — shown as a Watch button.">
                  <Input value={form.streamUrl} onChange={(_, { value }) => set('streamUrl', value)} placeholder="https://…" />
                </Field>
              </div>
              <div className={styles.formField}>
                <Switch
                  label="Participants are teams"
                  checked={form.teams}
                  onChange={(_, { checked }) => set('teams', checked)}
                />
              </div>
              {BRACKET_FORMATS.includes(form.format) && (
                <div className={styles.formField}>
                  <Field label="Bracket matches" hint="Best-of-N: winners need a majority of games.">
                    <Dropdown
                      value={form.bestOf === 1 ? 'Single game' : `Best of ${form.bestOf}`}
                      selectedOptions={[String(form.bestOf)]}
                      onOptionSelect={(_, { optionValue }) => set('bestOf', Number(optionValue))}
                    >
                      <Option value="1">Single game</Option>
                      <Option value="3">Best of 3</Option>
                      <Option value="5">Best of 5</Option>
                    </Dropdown>
                  </Field>
                </div>
              )}
              {form.format === 'racing' && (
                <div className={styles.formField}>
                  <Field label="Position points">
                    <Dropdown
                      value={form.positionPreset === 'custom' ? 'Custom' : POSITION_PRESETS[form.positionPreset].label}
                      selectedOptions={[form.positionPreset]}
                      onOptionSelect={(_, { optionValue }) => set('positionPreset', optionValue)}
                    >
                      {Object.entries(POSITION_PRESETS).map(([key, p]) => <Option key={key} value={key}>{p.label}</Option>)}
                      <Option value="custom">Custom</Option>
                    </Dropdown>
                  </Field>
                  {form.positionPreset === 'custom' && (
                    <Field label="Points for 1st, 2nd, … (comma-separated)" style={{ marginTop: '8px' }}>
                      <Input value={form.customTable} onChange={(_, { value }) => set('customTable', value)} placeholder="10, 7, 5, 3, 1" />
                    </Field>
                  )}
                </div>
              )}
              <div className={styles.formField}>
                <Field label="Cover / logo">
                  <ImagePicker name={form.name} value={form.image} onChange={(v) => set('image', v)} square maxPx={256} />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" disabled={!formValid} onClick={save}>Save</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(_, { open }) => !open && setPendingDelete(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogContent>This will permanently remove the tournament and all its data.</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={confirmDelete}>Delete</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
