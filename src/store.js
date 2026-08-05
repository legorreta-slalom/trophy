const NS = 'trophy:'

// Sync hook: the sync layer registers a callback fired on every data write,
// so mutations can be batched into background commits.
let onChange = null
export const setOnChange = (fn) => { onChange = fn }

export const getGames = () => JSON.parse(localStorage.getItem(NS + 'games') ?? '[]')
export const saveGames = (games) => {
  localStorage.setItem(NS + 'games', JSON.stringify(games))
  onChange?.()
}

export const getTournaments = () => JSON.parse(localStorage.getItem(NS + 'tournaments') ?? '[]')
export const saveTournaments = (ts) => {
  localStorage.setItem(NS + 'tournaments', JSON.stringify(ts))
  onChange?.()
}

export function saveGame(game) {
  const all = getGames()
  const idx = all.findIndex(g => g.id === game.id)
  if (idx === -1) all.push(game)
  else all[idx] = game
  saveGames(all)
}

export const deleteGame = (id) => saveGames(getGames().filter(g => g.id !== id))

export function saveTournament(tournament) {
  const all = getTournaments()
  const idx = all.findIndex(t => t.id === tournament.id)
  if (idx === -1) all.push(tournament)
  else all[idx] = tournament
  saveTournaments(all)
}

export const deleteTournament = (id) => saveTournaments(getTournaments().filter(t => t.id !== id))
