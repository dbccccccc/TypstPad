import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FloatingMenu } from '@/components/ui/floating-menu'
import type { MathSymbol, SymbolCategory } from '@/data/mathSymbols'
import SymbolPreview from './SymbolPreview'
import { useI18n } from '@/i18n'
import { translateMathTooltip } from '@/i18n/mathTooltips'
import {
  Plus,
  Languages,
  Divide,
  Superscript,
  TrendingUp,
  Triangle,
  Sigma,
  ListOrdered,
  Brackets,
  Grid3X3,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Plus: <Plus className="h-3.5 w-3.5" />,
  Languages: <Languages className="h-3.5 w-3.5" />,
  Divide: <Divide className="h-3.5 w-3.5" />,
  Superscript: <Superscript className="h-3.5 w-3.5" />,
  TrendingUp: <TrendingUp className="h-3.5 w-3.5" />,
  Triangle: <Triangle className="h-3.5 w-3.5" />,
  Sigma: <Sigma className="h-3.5 w-3.5" />,
  ListOrdered: <ListOrdered className="h-3.5 w-3.5" />,
  Brackets: <Brackets className="h-3.5 w-3.5" />,
  Grid3X3: <Grid3X3 className="h-3.5 w-3.5" />,
  ArrowRight: <ArrowRight className="h-3.5 w-3.5" />,
}

// Size classes for symbol buttons
const sizeClasses = {
  sm: "w-11 h-11 [&_svg]:max-w-[32px] [&_svg]:max-h-[32px] [&_img]:max-w-[32px] [&_img]:max-h-[32px]",
  md: "w-14 h-14 [&_svg]:max-w-[44px] [&_svg]:max-h-[44px] [&_img]:max-w-[44px] [&_img]:max-h-[44px]",
  lg: "w-20 h-20 [&_svg]:max-w-[64px] [&_svg]:max-h-[64px] [&_img]:max-w-[64px] [&_img]:max-h-[64px]",
}

// Column classes for grid layout
const columnClasses: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-4 sm:grid-cols-6",
}

interface SymbolPanelProps {
  category: SymbolCategory
  onInsertSymbol: (code: string) => void
}

export default function SymbolPanel({ category, onInsertSymbol }: SymbolPanelProps) {
  const { t, locale } = useI18n()
  const handleSymbolClick = useCallback((symbol: MathSymbol) => {
    onInsertSymbol(symbol.code)
  }, [onInsertSymbol])

  const categoryLabel = t(`math.category.${category.id}`)

  return (
    <FloatingMenu
      menuId={category.id}
      placement="bottom-start"
      contentClassName={cn(
        "min-w-[200px] max-w-[calc(100vw-16px)] sm:min-w-[240px] sm:max-w-[320px]",
        "max-h-[70dvh] overflow-y-auto p-2"
      )}
      trigger={({ isOpen, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "select-none whitespace-nowrap",
            isOpen && "bg-accent text-accent-foreground"
          )}
        >
          {iconMap[category.icon]}
          <span>{categoryLabel}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      )}
    >
      {/* Category Title */}
      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-2">
        {categoryLabel}
      </div>

      {/* Symbol Grid */}
      <TooltipProvider delayDuration={300}>
        <div className={cn("grid gap-1", columnClasses[category.columns || 6])}>
          {category.symbols.map((symbol, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleSymbolClick(symbol)}
                  className={cn(
                    "flex items-center justify-center rounded-md text-sm",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "cursor-pointer select-none overflow-hidden",
                    sizeClasses[category.symbolSize || 'sm']
                  )}
                >
                  <SymbolPreview code={symbol.code} fallback={symbol.display} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{translateMathTooltip(locale, symbol.tooltip)}</p>
                <p className="text-muted-foreground font-mono">{symbol.code}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </FloatingMenu>
  )
}
