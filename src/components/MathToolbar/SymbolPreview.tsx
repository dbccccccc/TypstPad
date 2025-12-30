import { useState, useEffect } from 'react'
import { compileSymbol } from '@/services/typst'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface SymbolPreviewProps {
  code: string
  fallback: string
  className?: string
}

export default function SymbolPreview({ code, fallback, className }: SymbolPreviewProps) {
  const { theme } = useTheme()
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    compileSymbol(code).then((result) => {
      if (!cancelled) {
        setSvg(result)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [code])

  if (loading || !svg) {
    return <span className={cn("text-foreground", className)}>{fallback}</span>
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center rounded", className)}
      style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
