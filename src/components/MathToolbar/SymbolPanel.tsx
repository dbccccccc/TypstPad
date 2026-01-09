import { useRef, useCallback, useContext, createContext, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { MathSymbol, SymbolCategory } from '@/data/mathSymbols'
import SymbolPreview from './SymbolPreview'
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
  6: "grid-cols-6",
}

// Context for managing which menu is open
export const MenuContext = createContext<{
  activeMenu: string | null
  isClosing: boolean
  openMenu: (id: string) => void
  closeMenu: () => void
}>({
  activeMenu: null,
  isClosing: false,
  openMenu: () => {},
  closeMenu: () => {},
})

interface SymbolPanelProps {
  category: SymbolCategory
  onInsertSymbol: (code: string) => void
}

export default function SymbolPanel({ category, onInsertSymbol }: SymbolPanelProps) {
  const { activeMenu, isClosing, openMenu, closeMenu } = useContext(MenuContext)
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const isOpen = activeMenu === category.id

  // Update position when menu opens
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
  }, [isOpen])

  const handleMouseEnter = useCallback(() => {
    openMenu(category.id)
  }, [category.id, openMenu])

  const handleMouseLeave = useCallback(() => {
    closeMenu()
  }, [closeMenu])

  const handleSymbolClick = useCallback((symbol: MathSymbol) => {
    onInsertSymbol(symbol.code)
  }, [onInsertSymbol])

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-md",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "select-none whitespace-nowrap",
          isOpen && "bg-accent text-accent-foreground"
        )}
      >
        {iconMap[category.icon]}
        <span>{category.name}</span>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Panel - rendered via Portal */}
      {isOpen && createPortal(
        <div
          className={cn(
            "fixed z-[9999]",
            "min-w-[240px] max-w-[320px] overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md",
            isClosing ? "animate-menu-hide" : "animate-menu-show"
          )}
          style={{ top: position.top, left: position.left }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Category Title */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-2">
            {category.name}
          </div>

          {/* Symbol Grid */}
          <TooltipProvider delayDuration={300}>
            <div className={cn("grid gap-1", columnClasses[category.columns || 6])}>
              {category.symbols.map((symbol, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
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
                    <p>{symbol.tooltip}</p>
                    <p className="text-muted-foreground font-mono">{symbol.code}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>,
        document.body
      )}
    </div>
  )
}
