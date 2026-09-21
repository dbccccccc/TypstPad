import React from 'react'
import ReactDOM from 'react-dom/client'
import PublicApp from './PublicApp'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import { I18nProvider } from './i18n'
import { resolveAppPage } from './navigation/routes'

async function start() {
  const page = resolveAppPage(window.location.pathname)
  // Leave the readable, pre-rendered HTML in place while the editor downloads.
  const content = page === 'editor'
    ? React.createElement((await import('./App')).default)
    : <PublicApp page={page} />

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <I18nProvider>
        <ThemeProvider>{content}</ThemeProvider>
      </I18nProvider>
    </React.StrictMode>,
  )
}

start().catch((error) => {
  // Keep the pre-rendered content and working links if application loading fails.
  console.error('Failed to start TypstPad:', error)
})
