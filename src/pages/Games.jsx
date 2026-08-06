import { useState } from 'react'
import {
  makeStyles,
  Title2, Body1,
  Button, Input, Field, Avatar,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, DialogTrigger,
  Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellActions,
} from '@fluentui/react-components'
import { AddRegular, DeleteRegular, EditRegular } from '@fluentui/react-icons'
import { getGames, saveGame, deleteGame, getTournaments } from '../store.js'
import ImagePicker from '../components/ImagePicker.jsx'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
})

export default function Games() {
  const styles = useStyles()
  const [games, setGames] = useState(getGames)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, game = editing
  const [name, setName] = useState('')
  const [image, setImage] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  function refresh() { setGames(getGames()) }

  function openNew() { setEditing({}); setName(''); setImage(null) }
  function openEdit(g) { setEditing(g); setName(g.name); setImage(g.image ?? null) }

  function save() {
    saveGame({
      ...(editing.id ? editing : { id: crypto.randomUUID() }),
      name: name.trim(),
      image,
    })
    refresh()
    setEditing(null)
  }

  function confirmDelete() {
    deleteGame(pendingDelete.id)
    refresh()
    setPendingDelete(null)
  }

  const usedGameIds = new Set(getTournaments().map(t => t.gameId))

  return (
    <>
      <div className={styles.header}>
        <Title2>Games</Title2>
        <Button appearance="primary" icon={<AddRegular />} onClick={openNew}>Add game</Button>
      </div>

      {games.length === 0 ? (
        <Body1>No games yet. Add one to get started.</Body1>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map(g => (
              <TableRow key={g.id}>
                <TableCell>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={g.name} color="colorful" shape="square" size={28} image={g.image ? { src: g.image } : undefined} />
                    {g.name}
                  </span>
                </TableCell>
                <TableCellActions>
                  <Button appearance="subtle" icon={<EditRegular />} aria-label="Edit" onClick={() => openEdit(g)} />
                  <Button appearance="subtle" icon={<DeleteRegular />} aria-label="Delete" onClick={() => setPendingDelete(g)} />
                </TableCellActions>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editing !== null} onOpenChange={(_, { open }) => !open && setEditing(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing?.id ? 'Edit game' : 'New game'}</DialogTitle>
            <DialogContent>
              <Field label="Name" required>
                <Input
                  autoFocus
                  value={name}
                  onChange={(_, { value }) => setName(value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && save()}
                />
              </Field>
              <Field label="Icon" style={{ marginTop: '12px' }}>
                <ImagePicker name={name} value={image} onChange={setImage} square />
              </Field>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" disabled={!name.trim()} onClick={save}>Save</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(_, { open }) => !open && setPendingDelete(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogContent>
              {usedGameIds.has(pendingDelete?.id)
                ? 'This game is used by one or more tournaments. Those tournaments will retain the reference but the name will no longer resolve.'
                : 'This will permanently remove the game.'}
            </DialogContent>
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
