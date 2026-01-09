import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync } from 'fs'

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const APP_VERSION = pkg.version

// Plugin to inject WASM preload tags
function wasmPreloadPlugin(): Plugin {
  const wasmFiles: string[] = []

  return {
    name: 'wasm-preload',
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.wasm')) {
          wasmFiles.push(fileName)
        }
      }
    },
    transformIndexHtml() {
      return wasmFiles.map(file => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: `/${file}`,
          as: 'fetch',
          crossorigin: 'anonymous'
        },
        injectTo: 'head' as const
      }))
    }
  }
}

// Plugin to generate version.json file
function versionFilePlugin(): Plugin {
  return {
    name: 'version-file-generator',
    writeBundle() {
      const versionInfo = {
        version: APP_VERSION,
        buildTime: new Date().toISOString()
      }

      const outDir = path.resolve(__dirname, 'dist')
      const versionPath = path.join(outDir, 'version.json')

      writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2))
      console.log(`✓ Generated version.json: ${APP_VERSION}`)
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasmPreloadPlugin(), versionFilePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION)
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@myriaddreamin/typst.ts']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
