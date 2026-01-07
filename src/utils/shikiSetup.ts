import { createHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import { shikiToMonaco } from '@shikijs/monaco'
import type { LanguageRegistration } from '@shikijs/types'
import type * as Monaco from 'monaco-editor'
import typstGrammar from '../grammars/typst.tmLanguage.json'
import { registerTypstCompletions } from './typstCompletions'

// Import only the themes we need
import vitesseLight from 'shiki/themes/vitesse-light.mjs'
import vitesseDark from 'shiki/themes/vitesse-dark.mjs'

let initPromise: Promise<void> | null = null

export async function setupShikiForMonaco(monaco: typeof Monaco) {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const highlighter = await createHighlighterCore({
      themes: [vitesseLight, vitesseDark],
      langs: [],
      engine: createOnigurumaEngine(import('shiki/wasm'))
    })

    // Load custom Typst syntax
    await highlighter.loadLanguage(typstGrammar as unknown as LanguageRegistration)

    // Register typst language
    monaco.languages.register({ id: 'typst' })

    // Register Typst completions
    registerTypstCompletions(monaco)

    // Integrate Shiki into Monaco
    shikiToMonaco(highlighter, monaco)
  })()

  return initPromise
}

export function getShikiInitPromise() {
  return initPromise
}
