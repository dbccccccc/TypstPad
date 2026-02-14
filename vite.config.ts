import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasmPreloadPlugin()],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'vendor-monaco'
          if (id.includes('@myriaddreamin')) return 'vendor-typst'
          return undefined
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
