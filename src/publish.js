import { getGames, getTournaments } from './store.js'

// Map of repo path → file content, used by both ZIP export and GitHub publish.
export function buildDataFiles() {
  const games = getGames()
  const tournaments = getTournaments()
  const files = {
    'data/games.json': JSON.stringify(games, null, 2),
    'data/index.json': JSON.stringify(
      tournaments.map(({ id, name, gameId, format, status, startDate, endDate }) =>
        ({ id, name, gameId, format, status, startDate, endDate })
      ), null, 2
    ),
  }
  for (const t of tournaments) {
    files[`data/tournaments/${t.id}.json`] = JSON.stringify(t, null, 2)
  }
  return files
}

const NS = 'trophy:'

export const getPublishSettings = () =>
  JSON.parse(localStorage.getItem(NS + 'publish') ?? '{"repo":"","branch":"main","token":""}')

export const savePublishSettings = (s) =>
  localStorage.setItem(NS + 'publish', JSON.stringify(s))

// Single commit via the Git Data API: base commit → new tree → commit → update ref.
export async function publishToGitHub({ repo, branch, token }) {
  const api = async (path, options = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
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

  const files = buildDataFiles()

  const ref = await api(`/git/ref/heads/${branch}`)
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
      message: 'chore: publish TROPHY data',
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  })

  await api(`/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })

  return commit.sha
}
