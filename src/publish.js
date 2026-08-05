import { getGames, getTournaments } from './store.js'
import { encryptToken } from './pinCrypto.js'
import { REPO, BRANCH } from './repo.js'

// Map of repo path → file content, used by both ZIP export and GitHub publish.
// Files live under public/ so Vite copies them into the built site, where the
// app (and spectators) fetch them at <base>/data/.
export async function buildDataFiles() {
  const games = getGames()
  const tournaments = getTournaments()
  const files = {
    'public/data/games.json': JSON.stringify(games, null, 2),
    'public/data/index.json': JSON.stringify(
      tournaments.map(({ id, name, gameId, format, status, startDate, endDate }) =>
        ({ id, name, gameId, format, status, startDate, endDate })
      ), null, 2
    ),
  }
  for (const t of tournaments) {
    files[`public/data/tournaments/${t.id}.json`] = JSON.stringify(t, null, 2)
  }

  // Participant self-reporting: ship the PAT encrypted with the host's PIN.
  const { token, pin } = getPublishSettings()
  if (pin?.trim() && token) {
    const encrypted = await encryptToken(token, pin.trim())
    files['public/data/access.json'] = JSON.stringify(encrypted, null, 2)
  }

  return files
}

const NS = 'trophy:'

export const getPublishSettings = () => ({
  token: '', pin: '',
  ...JSON.parse(localStorage.getItem(NS + 'publish') ?? '{}'),
})

export const savePublishSettings = (s) =>
  localStorage.setItem(NS + 'publish', JSON.stringify(s))

// Encrypted access blob fetched from the published site (spectator side).
export const getAccess = () =>
  JSON.parse(localStorage.getItem(NS + 'access') ?? 'null')

export const saveAccess = (a) =>
  localStorage.setItem(NS + 'access', JSON.stringify(a))

// Single commit via the Git Data API: base commit → new tree → commit → update ref.
export async function publishToGitHub({ token, message = 'chore: publish TROPHY data' }) {
  const api = async (path, options = {}) => {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `GitHub API error ${res.status}`)
    }
    return res.json()
  }

  const files = await buildDataFiles()

  // Concurrent flush from another device moves the ref between our read and
  // update ("not a fast forward", 422) — rebuild on the new head and retry.
  for (let attempt = 1; ; attempt++) {
    const ref = await api(`/git/ref/heads/${BRANCH}`)
    const baseCommit = await api(`/git/commits/${ref.object.sha}`)

    const tree = await api('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: Object.entries(files).map(([path, content]) => ({
          path, mode: '100644', type: 'blob', content,
        })),
      }),
    })

    const commit = await api('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [ref.object.sha],
      }),
    })

    try {
      await api(`/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha }),
      })
      return commit.sha
    } catch (err) {
      if (attempt >= 3 || !/fast forward/i.test(err.message)) throw err
    }
  }
}
