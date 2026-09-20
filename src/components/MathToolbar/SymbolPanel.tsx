import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, Brackets, ChevronDown, LayoutTemplate, Search, Sigma, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FloatingMenu, useMenuGroup } from '@/components/ui/floating-menu'
import type { MathSymbol } from '@/data/mathSymbols'
import { mathPickerGroups, type MathPickerGroup } from '@/data/mathPicker'
import SymbolPreview from './SymbolPreview'
import { useI18n } from '@/i18n'
import { translateMathTooltip } from '@/i18n/mathTooltips'

const groupIcons = { symbols: Sigma, structures: Brackets, functions: ArrowRight, templates: LayoutTemplate }

interface SymbolPanelProps {
  group: MathPickerGroup
  onInsertSymbol: (symbol: MathSymbol) => void
}

export default function SymbolPanel({ group, onInsertSymbol }: SymbolPanelProps) {
  const { t, locale } = useI18n()
  const { closeMenu } = useMenuGroup()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(group.categories[0].id)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const Icon = groupIcons[group.id]
  const isTemplate = group.id === 'templates'
  const isSymbol = group.id === 'symbols'
  const label = t(`math.picker.${group.id}`)
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const searching = terms.length > 0
  const visibleCategories = (searching ? mathPickerGroups : [group])
    .flatMap(sourceGroup => sourceGroup.categories
      .filter(category => searching || category.id === activeCategory)
      .map(category => ({
        ...category,
        groupId: sourceGroup.id,
        symbols: category.symbols.filter(symbol => {
          const text = `${symbol.display} ${symbol.code} ${symbol.tooltip} ${translateMathTooltip(locale, symbol.tooltip)} ${t(`math.category.${category.id}`)} ${t(`math.picker.${sourceGroup.id}`)}`.toLocaleLowerCase()
          return terms.every(term => text.includes(term))
        }),
      })))
    .filter(category => category.symbols.length > 0)
  const resultCount = visibleCategories.reduce((count, category) => count + category.symbols.length, 0)

  const insert = (symbol: MathSymbol) => {
    closeMenu()
    onInsertSymbol(symbol)
  }

  const navigateGrid = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIndex === -1) return
    const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }
    let nextIndex: number
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = buttons.length - 1
    else if (event.key in offsets) nextIndex = currentIndex + offsets[event.key]
    else return
    event.preventDefault()
    buttons[Math.max(0, Math.min(buttons.length - 1, nextIndex))]?.focus()
  }

  return (
    <FloatingMenu
      menuId={`math-${group.id}`}
      openOnHover={false}
      contentRole="dialog"
      contentLabel={label}
      offset={8}
      contentClassName="w-[680px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl shadow-xl"
      trigger={({ isOpen, triggerProps }) => (
        <button
          ref={triggerRef}
          type="button"
          {...triggerProps}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isTemplate ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            isOpen && (isTemplate ? 'bg-primary/15' : 'bg-accent text-foreground')
          )}
        >
          <Icon className="hidden h-3.5 w-3.5 sm:block" />
          {label}
          <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        </button>
      )}
    >
      <div
        className="flex h-[min(460px,75dvh)] flex-col"
        onKeyDown={event => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          closeMenu()
          triggerRef.current?.focus()
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            aria-label={t('math.picker.searchAll')}
            placeholder={t('math.picker.searchAll')}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                resultsRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
              } else if (event.key === 'Enter' && visibleCategories[0]?.symbols[0]) {
                event.preventDefault()
                insert(visibleCategories[0].symbols[0])
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" aria-label={t('math.picker.clearSearch')} onClick={() => setQuery('')} className="rounded p-1 text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {!searching && (
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/25 p-2 sm:w-36 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0" aria-label={t('math.picker.categories')}>
              {group.categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={activeCategory === category.id}
                  onClick={() => { setActiveCategory(category.id); setQuery('') }}
                  className={cn(
                    'flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeCategory === category.id ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {t(`math.category.${category.id}`)}
                  <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:inline">{category.symbols.length}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={resultsRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
            {searching && <p className="mb-3 px-1 text-xs text-muted-foreground">{t('math.picker.searchResults', { count: resultCount })}</p>}
            <TooltipProvider delayDuration={400}>
              {visibleCategories.map(category => {
                const showGlyph = category.groupId === 'symbols'
                const showTemplate = category.groupId === 'templates'
                return (
                  <section key={`${category.groupId}-${category.id}`} className="mb-4 last:mb-0">
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
                      <span>{searching && `${t(`math.picker.${category.groupId}`)} · `}{t(`math.category.${category.id}`)}</span>
                      <span className="tabular-nums">{category.symbols.length}</span>
                    </div>
                    <div
                      onKeyDown={navigateGrid}
                      className={cn('grid gap-2', showGlyph ? 'grid-cols-4 sm:grid-cols-5' : showTemplate ? 'grid-cols-2' : 'grid-cols-3')}
                    >
                      {category.symbols.map(symbol => {
                        const title = translateMathTooltip(locale, symbol.tooltip)
                        return (
                          <Tooltip key={symbol.code}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={title}
                                onClick={() => insert(symbol)}
                                className={cn(
                                  'group flex min-w-0 flex-col items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:border-primary/40 focus-visible:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  showTemplate ? 'border-border bg-muted/15' : 'bg-muted/35'
                                )}
                              >
                                <span className={cn('flex w-full min-w-0 items-center justify-center overflow-hidden', showGlyph ? 'h-8 font-serif text-2xl' : showTemplate ? 'h-20 px-2 [&_img]:max-h-20' : 'h-12 [&_img]:max-h-12')}>
                                  {showGlyph ? symbol.display : <SymbolPreview code={symbol.code} fallback={symbol.display} />}
                                </span>
                                <span className={cn('w-full truncate text-center text-muted-foreground group-hover:text-foreground', showTemplate ? 'text-xs font-medium' : 'text-[10px]')}>
                                  {title}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px] text-xs">
                              <p className="font-medium">{title}</p>
                              <p className="mt-1 break-words whitespace-pre-wrap font-mono text-muted-foreground">{symbol.code}</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </TooltipProvider>
            {resultCount === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Search className="mx-auto mb-3 h-6 w-6 opacity-50" />
                <p>{t('math.picker.noResults')}</p>
                <p className="mt-1 text-xs">{t('math.picker.searchHint')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
          {t(isSymbol ? 'math.picker.insertHint' : 'math.picker.templateHint')}
        </div>
      </div>
    </FloatingMenu>
  )
}
