import SymbolPanel from './SymbolPanel'
import { mathPickerGroups, quickInsertSymbols } from '@/data/mathPicker'
import type { MathSymbol } from '@/data/mathSymbols'
import { MenuGroupProvider } from '@/components/ui/floating-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { translateMathTooltip } from '@/i18n/mathTooltips'

interface MathToolbarProps {
  onInsertSymbol: (symbol: MathSymbol) => void
}

export default function MathToolbar({ onInsertSymbol }: MathToolbarProps) {
  const { t, locale } = useI18n()

  return (
    <MenuGroupProvider>
      <div className="border-b bg-muted/15">
        <div className="flex flex-wrap items-center gap-1 px-2 py-2 sm:px-3">
          {mathPickerGroups.map(group => (
            <SymbolPanel key={group.id} group={group} onInsertSymbol={onInsertSymbol} />
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 px-3 py-1.5">
          <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('math.picker.quickInsert')}</span>
          <TooltipProvider delayDuration={300}>
            {quickInsertSymbols.map(symbol => (
              <Tooltip key={symbol.code}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={translateMathTooltip(locale, symbol.tooltip)}
                    onClick={() => onInsertSymbol(symbol)}
                    className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 font-serif text-lg text-foreground/80 transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {symbol.display}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{translateMathTooltip(locale, symbol.tooltip)}</p>
                  <p className="mt-1 font-mono text-muted-foreground">{symbol.code}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
    </MenuGroupProvider>
  )
}
