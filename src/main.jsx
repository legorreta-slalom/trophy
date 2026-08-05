import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import App from './App.jsx'
import { hydrateFromPublished } from './hydrate.js'
import './index.css'

// Load published data for fresh browsers (spectators) before first render.
await hydrateFromPublished()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FluentProvider theme={webLightTheme}>
      <BrowserRouter basename="/trophy">
        <App />
      </BrowserRouter>
    </FluentProvider>
  </StrictMode>,
)
