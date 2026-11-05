import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { normalizeSiteUrl, parseIndexable } from './src/seo/metadata'
import { APP_PAGE_PATHS, resolveAppPage, resolvePageRedirect } from './src/navigation/routes'

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const APP_VERSION = pkg.version

// Monaco includes its own copy of DOMPurify, older than the release package.json
// pins. Resolve Monaco's import of it to the npm package instead, so the shipped
// version is the one npm audit checks.
const MONACO_DOMPURIFY_IMPORT = /^\.\/dompurify\/dompurify\.js$/
const MONACO_SANITIZER = /[\\/]monaco-editor[\\/]esm[\\/]vs[\\/]base[\\/]browser[\\/]domSanitize\.js$/
const MONACO_DOMPURIFY = /[\\/]monaco-editor[\\/]esm[\\/]vs[\\/]base[\\/]browser[\\/]dompurify[\\/]dompurify\.js$/
const withoutQuery = (id: string) => id.replace(/[?#].*$/, '')

function monacoDompurifyPlugin(): Plugin {
  return {
    name: 'typstpad-monaco-dompurify',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (MONACO_DOMPURIFY_IMPORT.test(source) && importer && MONACO_SANITIZER.test(withoutQuery(importer))) {
        return this.resolve('dompurify', importer, { ...options, skipSelf: true })
      }
    },
    load(id) {
      // Fail rather than ship Monaco's copy if a Monaco update imports it another way.
      if (MONACO_DOMPURIFY.test(withoutQuery(id))) {
        this.error(`Monaco's own DOMPurify would be bundled from ${id}. Update typstpad-monaco-dompurify in vite.config.ts.`)
      }
    },
  }
}

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
    plugins: [monacoDompurifyPlugin(), react(), pageRoutesPlugin()],
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
      esbuildOptions: {
        // The development server pre-bundles Monaco with esbuild, which skips Vite plugins.
        plugins: [{
          name: 'typstpad-monaco-dompurify',
          setup(build) {
            build.onResolve({ filter: MONACO_DOMPURIFY_IMPORT }, (args) =>
              MONACO_SANITIZER.test(args.importer)
                ? build.resolve('dompurify', { kind: args.kind, resolveDir: args.resolveDir })
                : undefined)
          },
        }],
      },
    },
    build: {
      rollupOptions: {
        output: {
          // A named chunk lets scripts/check-seo.mjs confirm that pages do not preload the editor.
          manualChunks(id) {
            if (/[\\/]node_modules[\\/](monaco-editor|dompurify)[\\/]/.test(id)) return 'vendor-monaco'
          },
        },
      },
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
