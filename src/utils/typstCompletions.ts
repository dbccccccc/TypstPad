import type * as Monaco from 'monaco-editor'
import { mathSymbolCategories } from '@/data/mathSymbols'

export function registerTypstCompletions(monaco: typeof Monaco) {
  monaco.languages.registerCompletionItemProvider('typst', {
    triggerCharacters: ['.', '(', '_', '^'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: Monaco.languages.CompletionItem[] = []

      // Add symbols from mathSymbolCategories
      for (const category of mathSymbolCategories) {
        for (const symbol of category.symbols) {
          const isFunction = symbol.code.includes('(')

          suggestions.push({
            label: symbol.code,
            kind: isFunction
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Constant,
            detail: `${symbol.display} - ${category.name}`,
            documentation: symbol.tooltip,
            insertText: symbol.code,
            insertTextRules: isFunction
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            range,
          })
        }
      }

      return { suggestions }
    },
  })
}
