import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { normalizeSiteUrl, parseIndexable } from './src/seo/metadata'
import { APP_PAGE_PATHS, resolveAppPage, resolvePageRedirect } from './src/navigation/routes'

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const APP_VERSION = pkg.version

// Production uses real HTML files. Only known app routes need a dev fallback.
function pageRoutesPlugin(): Plugin {
  return {
    name: 'typstpad-page-routes',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        const destination = resolvePageRedirect(url.pathname)
        if (destination) {
          response.writeHead(301, { Location: destination + url.search })
          response.end()
          return
        }
        if (resolveAppPage(url.pathname) !== 'not-found') {
          request.url = `/index.html${url.search}`
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        const destination = resolvePageRedirect(url.pathname)
        if (destination) {
          response.writeHead(301, { Location: destination + url.search })
          response.end()
          return
        }
        const page = resolveAppPage(url.pathname)
        if (page !== 'not-found') {
          const prefix = page === 'editor' ? '' : APP_PAGE_PATHS[page]
          request.url = `${prefix}/index.html${url.search}`
        }
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SITE_')
  const siteUrl = normalizeSiteUrl(env.SITE_URL?.trim() || (mode === 'site' ? 'https://typstpad.com' : ''))
  return {
    appType: 'mpa',
    plugins: [react(), pageRoutesPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __SITE_URL__: JSON.stringify(siteUrl),
      __SITE_INDEXABLE__: JSON.stringify(parseIndexable(env.SITE_INDEXABLE)),
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    optimizeDeps: {
      exclude: ['@myriaddreamin/typst.ts'],
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  }
})
