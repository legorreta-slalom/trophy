import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components'
import App from './App.jsx'
import { hydrateFromPublished } from './hydrate.js'
import { initSync } from './sync.js'
import './index.css'

// Load published data for fresh browsers (spectators) before first render.
await hydrateFromPublished()
initSync()

function Root() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
      <BrowserRouter basename="/trophy">
        <App />
      </BrowserRouter>
    </FluentProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
