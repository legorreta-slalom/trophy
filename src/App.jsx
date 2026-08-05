import { Routes, Route, NavLink } from 'react-router-dom'
import {
  makeStyles, tokens,
  Title3, Body1Strong, Body1,
  Button, Tooltip,
} from '@fluentui/react-components'
import { TrophyFilled, ArrowDownloadRegular } from '@fluentui/react-icons'
import Tournaments from './pages/Tournaments.jsx'
import Games from './pages/Games.jsx'
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

function exportData() {
  const data = { games: getGames(), tournaments: getTournaments() }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trophy-data.json'
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
            content="Download trophy-data.json, commit it to your repo to publish."
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
          <Route path="/games" element={<Games />} />
        </Routes>
      </main>
    </div>
  )
}
