import { useState, useRef, useCallback, useEffect } from 'react'
import SymbolPanel, { MenuContext } from './SymbolPanel'
import { mathSymbolCategories } from '@/data/mathSymbols'

interface MathToolbarProps {
  onInsertSymbol: (code: string) => void
}

export default function MathToolbar({ onInsertSymbol }: MathToolbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const closingAnimationRef = useRef<ReturnType<typeof setTimeout>>()

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(closeTimeoutRef.current)
      clearTimeout(closingAnimationRef.current)
    }
  }, [])

  const openMenu = useCallback((id: string) => {
    clearTimeout(closeTimeoutRef.current)
    clearTimeout(closingAnimationRef.current)
    setIsClosing(false)
    setActiveMenu(id)
  }, [])

  const closeMenu = useCallback(() => {
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(true)
      closingAnimationRef.current = setTimeout(() => {
        setActiveMenu(null)
        setIsClosing(false)
      }, 150) // Match animation duration
    }, 80)
  }, [])

  return (
    <MenuContext.Provider value={{ activeMenu, isClosing, openMenu, closeMenu }}>
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 overflow-x-auto">
        {mathSymbolCategories.map((category) => (
          <SymbolPanel
            key={category.id}
            category={category}
            onInsertSymbol={onInsertSymbol}
          />
        ))}
      </div>
    </MenuContext.Provider>
  )
}
