import { describe, it, expect, vi, beforeEach } from 'vitest'

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null },
  setItem(k, v) { this.store[k] = String(v) },
  removeItem(k) { delete this.store[k] },
}

import { publishToGitHub } from './publish.js'

// Route fake responses by URL suffix; PATCH /git/refs is scripted per call.
function mockGitHub(refPatchResponses) {
  let patchCall = 0
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    const ok = (json) => ({ ok: true, json: async () => json })
    if (url.includes('/git/ref/heads/')) return ok({ object: { sha: 'head-sha' } })
    if (url.includes('/git/commits/') && !options.method) return ok({ tree: { sha: 'tree-sha' } })
    if (url.endsWith('/git/trees')) return ok({ sha: 'new-tree' })
    if (url.endsWith('/git/commits')) return ok({ sha: 'new-commit' })
    if (url.includes('/git/refs/heads/')) {
      const r = refPatchResponses[patchCall++]
      return r === 'ok'
        ? ok({})
        : { ok: false, json: async () => ({ message: r }) }
    }
    throw new Error(`unexpected url ${url}`)
  })
}

describe('publish conflict retry', () => {
  beforeEach(() => {
    localStorage.store = {}
    vi.restoreAllMocks()
  })

  it('rebuilds and retries on 422 not-a-fast-forward', async () => {
    mockGitHub(['Update is not a fast forward', 'ok'])
    const sha = await publishToGitHub({ token: 'tok' })
    expect(sha).toBe('new-commit')
    const patches = globalThis.fetch.mock.calls.filter(([url]) => url.includes('/git/refs/heads/'))
    expect(patches).toHaveLength(2)
  })

  it('does not retry other errors', async () => {
    mockGitHub(['Bad credentials'])
    await expect(publishToGitHub({ token: 'tok' })).rejects.toThrow('Bad credentials')
    const patches = globalThis.fetch.mock.calls.filter(([url]) => url.includes('/git/refs/heads/'))
    expect(patches).toHaveLength(1)
  })

  it('gives up after 3 attempts', async () => {
    mockGitHub(['Update is not a fast forward', 'Update is not a fast forward', 'Update is not a fast forward'])
    await expect(publishToGitHub({ token: 'tok' })).rejects.toThrow(/fast forward/)
    const patches = globalThis.fetch.mock.calls.filter(([url]) => url.includes('/git/refs/heads/'))
    expect(patches).toHaveLength(3)
  })
})
