import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
