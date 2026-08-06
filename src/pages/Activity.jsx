import { useState, useEffect } from 'react'
import { makeStyles, tokens, Title2, Body1, Body1Strong, Caption1, Spinner } from '@fluentui/react-components'
import { REPO, BRANCH } from '../repo.js'

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    padding: '10px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  when: { color: tokens.colorNeutralForeground3, minWidth: '110px' },
})

function relative(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// The repo's commit history IS the audit log — surface it read-only.
export default function Activity() {
  const styles = useStyles()
  const [commits, setCommits] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=30`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`GitHub API ${r.status}`)))
      .then(setCommits)
      .catch(e => setError(e.message))
  }, [])

  return (
    <>
      <Title2 style={{ display: 'block', marginBottom: '20px' }}>Activity</Title2>
      {error && <Body1>Couldn&rsquo;t load activity: {error}</Body1>}
      {!commits && !error && <Spinner label="Loading repo history…" />}
      {commits && commits.map(c => (
        <div key={c.sha} className={styles.row}>
          <Caption1 className={styles.when}>{relative(c.commit.author.date)}</Caption1>
          <div>
            <Body1Strong>{c.commit.message.split('\n')[0]}</Body1Strong>
            <Caption1 style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>
              {c.commit.author.name} · {c.sha.slice(0, 7)}
            </Caption1>
          </div>
        </div>
      ))}
    </>
  )
}
