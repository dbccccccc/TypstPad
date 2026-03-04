import type * as Monaco from 'monaco-editor'
import { mathSymbolCategories } from '@/data/mathSymbols'
import { typstSymbolCompletions } from '@/data/typstSymbolCompletions'
import { getCurrentLocale } from '@/i18n'
import { translateMathCategory, translateMathTooltip } from '@/i18n/mathTooltips'

export function registerTypstCompletions(
  monaco: typeof Monaco,
  languageIds: string[] = ['typst']
) {
  const triggerCharacters = ['.', '(', '_', '^', '!', '*', '-', ':', '<', '=', '?', '[', ']', '|', '~']

  for (const languageId of languageIds) {
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters,
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
        const seenLabels = new Set<string>()

        const addSuggestion = (item: Monaco.languages.CompletionItem) => {
          const label = typeof item.label === 'string' ? item.label : item.label.label
          if (seenLabels.has(label)) {
            return
          }
          seenLabels.add(label)
          suggestions.push(item)
        }

        // Add symbols from mathSymbolCategories
        for (const category of mathSymbolCategories) {
          const categoryLabel = translateMathCategory(locale, category.id, category.name)
          for (const symbol of category.symbols) {
            const isFunction = symbol.code.includes('(')
            const tooltip = translateMathTooltip(locale, symbol.tooltip)

            addSuggestion({
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

        // Add the full Typst symbol set from the official docs.
        for (const symbol of typstSymbolCompletions) {
          const isShorthand = symbol.source !== 'name'
          addSuggestion({
            label: symbol.code,
            kind: isShorthand
              ? monaco.languages.CompletionItemKind.Operator
              : monaco.languages.CompletionItemKind.Constant,
            detail: isShorthand
              ? `${symbol.display} - Typst shorthand`
              : `${symbol.display} - Typst symbol`,
            documentation: symbol.tooltip,
            insertText: symbol.code,
            range,
          })
        }

        return { suggestions }
      },
    })
  }
}
