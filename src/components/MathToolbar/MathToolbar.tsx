import SymbolPanel from './SymbolPanel'
import { mathSymbolCategories } from '@/data/mathSymbols'
import { MenuGroupProvider } from '@/components/ui/floating-menu'

interface MathToolbarProps {
  onInsertSymbol: (code: string) => void
}

export default function MathToolbar({ onInsertSymbol }: MathToolbarProps) {
  return (
    <MenuGroupProvider>
      <div className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 border-b bg-muted/30 overflow-x-auto">
        {mathSymbolCategories.map((category) => (
          <SymbolPanel
            key={category.id}
            category={category}
            onInsertSymbol={onInsertSymbol}
          />
        ))}
      </div>
    </MenuGroupProvider>
  )
}
