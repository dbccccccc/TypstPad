import { loader } from '@monaco-editor/react'
// The editor and its built-in features, without the languages TypstPad does not use.
import 'monaco-editor/esm/vs/editor/edcore.main.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'

// Typst support comes from Shiki and TypstPad's completions, so only Monaco's
// own worker is needed.
self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

// Use this bundled Monaco instead of loading one from a CDN.
loader.config({ monaco })
