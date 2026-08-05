import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./publish.js', () => ({
  getPublishSettings: vi.fn(() => ({ token: 'tok', pin: '' })),
  publishToGitHub: vi.fn(async () => 'sha123'),
}))

// Browser globals for the node test environment
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null },
  setItem(k, v) { this.store[k] = String(v) },
  removeItem(k) { delete this.store[k] },
}
globalThis.window = { addEventListener: () => {} }

import { saveTournaments } from './store.js'
import { publishToGitHub } from './publish.js'
import { initSync, flush, getSyncStatus, withSyncPaused, QUIET_MS } from './sync.js'

describe('batched sync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorage.store = {}
    initSync()
  })

  it('flushes many rapid mutations as exactly one commit', async () => {
    for (let i = 0; i < 10; i++) saveTournaments([])

    expect(getSyncStatus().pending).toBe(10)
    expect(publishToGitHub).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(QUIET_MS)

    expect(publishToGitHub).toHaveBeenCalledTimes(1)
    expect(publishToGitHub.mock.calls[0][0].message).toBe('sync: 10 changes')
    expect(getSyncStatus().pending).toBe(0)
    expect(getSyncStatus().state).toBe('synced')
  })

  it('does not sync while paused (hydration/pull)', async () => {
    await withSyncPaused(async () => {
      saveTournaments([])
      saveTournaments([])
    })
    expect(getSyncStatus().pending).toBe(0)
    await vi.advanceTimersByTimeAsync(QUIET_MS * 2)
    expect(publishToGitHub).not.toHaveBeenCalled()
  })

  it('flush is a no-op with nothing pending', async () => {
    await flush()
    expect(publishToGitHub).not.toHaveBeenCalled()
  })
})
