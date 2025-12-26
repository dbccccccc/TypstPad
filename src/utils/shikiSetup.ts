import { createHighlighter } from 'shiki'
import { shikiToMonaco } from '@shikijs/monaco'
import type * as Monaco from 'monaco-editor'
import typstGrammar from '../grammars/typst.tmLanguage.json'

let initPromise: Promise<void> | null = null

export async function setupShikiForMonaco(monaco: typeof Monaco) {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const highlighter = await createHighlighter({
      themes: ['vitesse-light', 'vitesse-dark'],
      langs: [],
    })

    // Load custom Typst syntax
    await highlighter.loadLanguage(typstGrammar as any)

    // Register typst language
    monaco.languages.register({ id: 'typst' })

    // Integrate Shiki into Monaco
    shikiToMonaco(highlighter, monaco)
  })()

  return initPromise
}

export function getShikiInitPromise() {
  return initPromise
}
