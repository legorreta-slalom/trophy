import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title3, Body1Strong, Body1, Caption1,
  Button, Tooltip, Input, Field,
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, DialogTrigger,
  Spinner,
} from '@fluentui/react-components'
import { TrophyFilled, ArrowDownloadRegular, CloudArrowUpRegular, LockOpenRegular, ArrowSyncRegular } from '@fluentui/react-icons'
import Tournaments from './pages/Tournaments.jsx'
import TournamentDetail from './pages/TournamentDetail.jsx'
import Games from './pages/Games.jsx'
import HallOfFame from './pages/HallOfFame.jsx'
import JSZip from 'jszip'
import { buildDataFiles, getPublishSettings, savePublishSettings, publishToGitHub, getAccess } from './publish.js'
import { decryptToken } from './pinCrypto.js'
import { pullPublished } from './hydrate.js'

const MOBILE = '@media (max-width: 640px)'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    [MOBILE]: { flexDirection: 'column' },
  },
  sidebar: {
    width: '220px',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    [MOBILE]: {
      width: '100%',
      minHeight: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      borderRight: 'none',
      borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    [MOBILE]: { padding: '10px 12px', borderBottom: 'none' },
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '12px 8px',
    [MOBILE]: { flexDirection: 'row', padding: '0', gap: '4px' },
  },
  navLink: {
    display: 'block',
    padding: '8px 12px',
    textDecoration: 'none',
    color: tokens.colorNeutralForeground2,
    borderRadius: tokens.borderRadiusMedium,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navLinkActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      color: tokens.colorBrandForeground1,
    },
  },
  exportArea: {
    padding: '12px 8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    [MOBILE]: { padding: '0 8px', borderTop: 'none', display: 'flex' },
  },
  sideButton: {
    width: '100%',
    justifyContent: 'flex-start',
    [MOBILE]: { width: 'auto' },
  },
  sideButtonLabel: {
    [MOBILE]: { display: 'none' },
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '28px 32px',
    [MOBILE]: { padding: '16px' },
  },
})

async function exportData() {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(await buildDataFiles())) {
    zip.file(path, content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trophy-data.zip'
  a.click()
  URL.revokeObjectURL(url)
}

function PublishDialog({ open, onClose }) {
  const [settings, setSettings] = useState(getPublishSettings)
  const [state, setState] = useState({ phase: 'idle' }) // idle | publishing | done | error

  function set(field, value) { setSettings(s => ({ ...s, [field]: value })) }

  const valid = /^[\w.-]+\/[\w.-]+$/.test(settings.repo) && settings.branch.trim() && settings.token.trim()

  async function publish() {
    savePublishSettings(settings)
    setState({ phase: 'publishing' })
    try {
      const sha = await publishToGitHub(settings)
      setState({ phase: 'done', sha })
    } catch (err) {
      setState({ phase: 'error', message: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, { open }) => !open && onClose()}>
      <DialogSurface style={{ maxWidth: '440px' }}>
        <DialogBody>
          <DialogTitle>Publish to GitHub</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Repository" hint="owner/name, e.g. legorreta-slalom/trophy" required>
                <Input value={settings.repo} onChange={(_, { value }) => set('repo', value)} placeholder="owner/repo" />
              </Field>
              <Field label="Branch" required>
                <Input value={settings.branch} onChange={(_, { value }) => set('branch', value)} />
              </Field>
              <Field label="Personal access token" hint="Needs contents: write on the repo. Stored only in your browser." required>
                <Input type="password" value={settings.token} onChange={(_, { value }) => set('token', value)} />
              </Field>
              <Field label="Participant PIN" hint="Optional. Publishes the token encrypted with this PIN so participants can unlock result reporting.">
                <Input value={settings.pin} onChange={(_, { value }) => set('pin', value)} />
              </Field>
              {state.phase === 'done' && (
                <Caption1 style={{ color: tokens.colorPaletteGreenForeground1 }}>
                  Published — commit {state.sha.slice(0, 7)}. GitHub Pages will rebuild shortly.
                </Caption1>
              )}
              {state.phase === 'error' && (
                <Caption1 style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {state.message}
                </Caption1>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              disabled={!valid || state.phase === 'publishing'}
              icon={state.phase === 'publishing' ? <Spinner size="tiny" /> : <CloudArrowUpRegular />}
              onClick={publish}
            >
              {state.phase === 'publishing' ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

function UnlockDialog({ open, onClose, onUnlocked }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function unlock() {
    try {
      const access = getAccess()
      const token = await decryptToken(access, pin.trim())
      savePublishSettings({ repo: access.repo, branch: access.branch, token, pin: '' })
      onUnlocked()
      onClose()
    } catch {
      setError('Wrong PIN.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, { open }) => !open && onClose()}>
      <DialogSurface style={{ maxWidth: '380px' }}>
        <DialogBody>
          <DialogTitle>Report results</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="PIN" hint="Ask the tournament host for the PIN." validationMessage={error || undefined}>
                <Input
                  value={pin}
                  onChange={(_, { value }) => { setPin(value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && pin.trim() && unlock()}
                />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" disabled={!pin.trim()} icon={<LockOpenRegular />} onClick={unlock}>
              Unlock
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

function PullDialog({ open, onClose }) {
  const [state, setState] = useState({ phase: 'idle' })

  async function pull() {
    setState({ phase: 'pulling' })
    try {
      await pullPublished()
      window.location.reload()
    } catch (err) {
      setState({ phase: 'error', message: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, { open }) => !open && onClose()}>
      <DialogSurface style={{ maxWidth: '400px' }}>
        <DialogBody>
          <DialogTitle>Pull latest published data?</DialogTitle>
          <DialogContent>
            <Body1>This replaces everything in this browser with the currently published version. Unpublished local changes are lost.</Body1>
            {state.phase === 'error' && (
              <Caption1 style={{ color: tokens.colorPaletteRedForeground1, display: 'block', marginTop: '8px' }}>
                {state.message}
              </Caption1>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              disabled={state.phase === 'pulling'}
              icon={state.phase === 'pulling' ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
              onClick={pull}
            >
              {state.phase === 'pulling' ? 'Pulling…' : 'Pull latest'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export default function App() {
  const styles = useStyles()
  const [publishOpen, setPublishOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [pullOpen, setPullOpen] = useState(false)
  const [canReport, setCanReport] = useState(() => Boolean(getAccess()) && !getPublishSettings().token)
  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <TrophyFilled style={{ fontSize: '22px', color: tokens.colorBrandForeground1 }} />
          <Title3>TROPHY</Title3>
        </div>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <Body1Strong>Tournaments</Body1Strong>
          </NavLink>
          <NavLink
            to="/games"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <Body1Strong>Games</Body1Strong>
          </NavLink>
          <NavLink
            to="/hall-of-fame"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <Body1Strong>Hall of Fame</Body1Strong>
          </NavLink>
        </nav>
        <div className={styles.exportArea}>
          {canReport && (
            <Tooltip content="Enter the tournament PIN to unlock result reporting." relationship="description">
              <Button
                appearance="subtle"
                icon={<LockOpenRegular />}
                onClick={() => setUnlockOpen(true)}
                className={styles.sideButton}
              >
                <Body1 className={styles.sideButtonLabel}>Report results</Body1>
              </Button>
            </Tooltip>
          )}
          <Tooltip content="Fetch the latest published data into this browser." relationship="description">
            <Button
              appearance="subtle"
              icon={<ArrowSyncRegular />}
              onClick={() => setPullOpen(true)}
              className={styles.sideButton}
            >
              <Body1 className={styles.sideButtonLabel}>Pull latest</Body1>
            </Button>
          </Tooltip>
          <Tooltip
            content="Commit data/ files to your GitHub repo directly. Pages rebuilds automatically."
            relationship="description"
          >
            <Button
              appearance="subtle"
              icon={<CloudArrowUpRegular />}
              onClick={() => setPublishOpen(true)}
              className={styles.sideButton}
            >
              <Body1 className={styles.sideButtonLabel}>Publish</Body1>
            </Button>
          </Tooltip>
          <Tooltip
            content="Download trophy-data.zip. Unzip into your repo root and commit to publish."
            relationship="description"
          >
            <Button
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              onClick={exportData}
              className={styles.sideButton}
            >
              <Body1 className={styles.sideButtonLabel}>Export data</Body1>
            </Button>
          </Tooltip>
        </div>
        <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
        <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onUnlocked={() => setCanReport(false)} />
        <PullDialog open={pullOpen} onClose={() => setPullOpen(false)} />
      </aside>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
        </Routes>
      </main>
    </div>
  )
}
