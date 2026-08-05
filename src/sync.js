import { setOnChange } from './store.js'
import { getPublishSettings, publishToGitHub } from './publish.js'

// Batched write sync (#29): mutations accumulate locally and flush as ONE
// commit after a quiet period, at a max age, on demand, or on tab close.
// No token configured = spectator = no sync.
const NS = 'trophy:'
export const QUIET_MS = 2 * 60_000
export const MAX_AGE_MS = 10 * 60_000

let quietTimer = null
let maxTimer = null
let paused = false
let status = { state: 'idle', pending: 0, lastSync: null }
const listeners = new Set()

export const getSyncStatus = () => status
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setStatus(patch) {
  status = { ...status, ...patch }
  for (const fn of listeners) fn(status)
}

const readPersisted = () => JSON.parse(localStorage.getItem(NS + 'sync') ?? '{"pending":0,"lastSync":null}')
const persist = () => localStorage.setItem(NS + 'sync', JSON.stringify({ pending: status.pending, lastSync: status.lastSync }))

function onMutation() {
  if (paused || !getPublishSettings().token) return
  setStatus({ state: 'pending', pending: status.pending + 1 })
  persist()
  clearTimeout(quietTimer)
  quietTimer = setTimeout(flush, QUIET_MS)
  if (!maxTimer) maxTimer = setTimeout(flush, MAX_AGE_MS)
}

export async function flush() {
  clearTimeout(quietTimer)
  clearTimeout(maxTimer)
  quietTimer = maxTimer = null
  const { token } = getPublishSettings()
  if (!status.pending || !token) return

  const count = status.pending
  setStatus({ state: 'syncing' })
  try {
    await publishToGitHub({ token, message: `sync: ${count} change${count === 1 ? '' : 's'}` })
    setStatus({ state: 'synced', pending: 0, lastSync: new Date().toISOString() })
  } catch (err) {
    setStatus({ state: 'error', error: err.message })
  }
  persist()
}

// Hydration/pull writes are canonical data coming FROM the repo — never re-sync them.
export async function withSyncPaused(fn) {
  paused = true
  try {
    await fn()
    setStatus({ state: 'idle', pending: 0 })
    persist()
  } finally {
    paused = false
  }
}

export function initSync() {
  const saved = readPersisted()
  status = { ...status, pending: saved.pending, lastSync: saved.lastSync }
  setOnChange(onMutation)
  // A batch stranded by a closed tab flushes shortly after the next open.
  if (status.pending > 0 && getPublishSettings().token) {
    setStatus({ state: 'pending' })
    quietTimer = setTimeout(flush, 5_000)
  }
  window.addEventListener('pagehide', () => { if (status.pending > 0) flush() })
}
