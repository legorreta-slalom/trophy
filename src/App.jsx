import { Routes, Route, NavLink } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title3, Body1Strong, Body1,
  Button, Tooltip,
} from '@fluentui/react-components'
import { TrophyFilled, ArrowDownloadRegular } from '@fluentui/react-icons'
import Tournaments from './pages/Tournaments.jsx'
import TournamentDetail from './pages/TournamentDetail.jsx'
import Games from './pages/Games.jsx'
import JSZip from 'jszip'
import { getGames, getTournaments } from './store.js'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '220px',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '12px 8px',
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
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '28px 32px',
  },
})

async function exportData() {
  const games = getGames()
  const tournaments = getTournaments()
  const zip = new JSZip()
  const data = zip.folder('data')

  data.file('games.json', JSON.stringify(games, null, 2))
  data.file('index.json', JSON.stringify(
    tournaments.map(({ id, name, gameId, format, status, startDate, endDate }) =>
      ({ id, name, gameId, format, status, startDate, endDate })
    ), null, 2
  ))

  const tournamentFolder = data.folder('tournaments')
  for (const t of tournaments) {
    tournamentFolder.file(`${t.id}.json`, JSON.stringify(t, null, 2))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trophy-data.zip'
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const styles = useStyles()
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
        </nav>
        <div className={styles.exportArea}>
          <Tooltip
            content="Download trophy-data.zip. Unzip into your repo root and commit to publish."
            relationship="description"
          >
            <Button
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              onClick={exportData}
              style={{ width: '100%', justifyContent: 'flex-start' }}
            >
              <Body1>Export data</Body1>
            </Button>
          </Tooltip>
        </div>
      </aside>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/games" element={<Games />} />
        </Routes>
      </main>
    </div>
  )
}
