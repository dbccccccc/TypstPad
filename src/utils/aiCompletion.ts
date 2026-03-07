// AI inline completion provider for Monaco editor.
// Registers a Ctrl+Space triggered inline completion that queries the Tauri backend.

import type * as Monaco from 'monaco-editor'
import {
  chatCompletion,
  buildInlineCompletionPrompt,
  loadAISettings,
  isTauriEnv,
} from '@/services/ai'

let disposable: Monaco.IDisposable | null = null

export function registerAICompletionProvider(monaco: typeof Monaco): void {
  // Only register once
  if (disposable) return

  disposable = monaco.languages.registerInlineCompletionsProvider('typst', {
    provideInlineCompletions: async (model, position, _context, token) => {
      // Check if AI inline completion is enabled
      try {
        if (localStorage.getItem('typstpad-ai-inline-completion') === 'false') {
          return { items: [] }
        }
      } catch {
        // Ignore
      }

      if (!isTauriEnv()) {
        return { items: [] }
      }

      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const textAfterPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: model.getLineCount(),
        endColumn: model.getLineMaxColumn(model.getLineCount()),
      })

      // Don't trigger on empty content
      if (!textUntilPosition.trim()) {
        return { items: [] }
      }

      const settings = loadAISettings()
      const messages = buildInlineCompletionPrompt(textUntilPosition, textAfterPosition)

      try {
        const response = await chatCompletion({
          messages,
          model: settings.model || undefined,
          temperature: 0.2, // Low temp for completions
          max_tokens: 256,
          base_url: settings.baseUrl || undefined,
        })

        if (token.isCancellationRequested) {
          return { items: [] }
        }

        const completionText = response.content.trim()
        if (!completionText) {
          return { items: [] }
        }

        return {
          items: [
            {
              insertText: completionText,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            },
          ],
        }
      } catch {
        return { items: [] }
      }
    },
    disposeInlineCompletions: () => {
      // No-op cleanup
    },
  })
}

export function disposeAICompletionProvider(): void {
  if (disposable) {
    disposable.dispose()
    disposable = null
  }
}
