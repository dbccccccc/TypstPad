import type * as Monaco from 'monaco-editor'
import { mathSymbolCategories } from '@/data/mathSymbols'
import { getCurrentLocale } from '@/i18n'
import { translateMathCategory, translateMathTooltip } from '@/i18n/mathTooltips'

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

      const locale = getCurrentLocale()
      const suggestions: Monaco.languages.CompletionItem[] = []

      // Add symbols from mathSymbolCategories
      for (const category of mathSymbolCategories) {
        const categoryLabel = translateMathCategory(locale, category.id, category.name)
        for (const symbol of category.symbols) {
          const isFunction = symbol.code.includes('(')
          const tooltip = translateMathTooltip(locale, symbol.tooltip)

          suggestions.push({
            label: symbol.code,
            kind: isFunction
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Constant,
            detail: `${symbol.display} - ${categoryLabel}`,
            documentation: tooltip,
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
