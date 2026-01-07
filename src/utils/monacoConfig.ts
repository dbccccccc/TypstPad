import { loader } from '@monaco-editor/react'

// Configure Monaco loader to use local files instead of CDN
export function configureMonacoLoader() {
  loader.config({
    paths: {
      vs: '/monaco-editor/vs'
    }
  })
}
