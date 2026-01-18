import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import { configureMonacoLoader } from './utils/monacoConfig'
import { I18nProvider } from './i18n'

// Register Service Worker for caching WASM and fonts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service Worker registration failed, continue without caching
    })
  })
}

// Configure Monaco to use local files before any editor initialization
configureMonacoLoader()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
)
