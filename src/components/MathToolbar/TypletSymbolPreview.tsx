import { renderTypletSymbol } from '@/services/typlet'
import { cn } from '@/lib/utils'
import TypletFormula from '../TypletFormula/TypletFormula'

interface TypletSymbolPreviewProps {
  code: string
  fallback: string
  className?: string
}

// typst.ts renders picker entries with 18pt text, and its images have a pixel per point.
const SYMBOL_FONT_SIZE = 18

/** A picker entry rendered by Typlet, in the text color, so it suits both themes. */
export default function TypletSymbolPreview({ code, fallback, className }: TypletSymbolPreviewProps) {
  const html = renderTypletSymbol(code)

  if (!html) {
    return <span className={cn('text-foreground', className)}>{fallback}</span>
  }

  return (
    <TypletFormula
      html={html}
      fontSize={SYMBOL_FONT_SIZE}
      fitHeight
      className={cn('h-full w-full text-foreground', className)}
    />
  )
}
