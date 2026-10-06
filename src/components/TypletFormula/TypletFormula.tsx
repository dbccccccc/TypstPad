import { useLayoutEffect, useRef, useState } from 'react'
import 'typlet/fonts/typlet.css'
import { cn } from '@/lib/utils'

interface TypletFormulaProps {
  /** Markup from Typlet, which escapes the formula's text. */
  html: string
  /** The font size in pixels, before shrinking to fit. */
  fontSize: number
  /** Shrink to fit the container's height as well as its width. */
  fitHeight?: boolean
  className?: string
}

/**
 * A formula rendered by Typlet, shrunk to fit its container as the typst.ts
 * images are. Typlet lays formulas out in ems, so a smaller font size scales the
 * whole formula, and its layout box with it.
 */
export default function TypletFormula({ html, fontSize, fitHeight = false, className }: TypletFormulaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef(1)
  const [fit, setFit] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const measure = () => {
      const current = fitRef.current
      // Layout sizes ignore the transforms of opening menus and dialogs; they are
      // whole pixels, so a pixel is kept in reserve for rounding.
      const width = content.offsetWidth / current
      const height = content.offsetHeight / current
      let next = 1
      if (width > 0 && container.clientWidth > 1) next = Math.min(next, (container.clientWidth - 1) / width)
      if (fitHeight && height > 0 && container.clientHeight > 1) next = Math.min(next, (container.clientHeight - 1) / height)
      // Ignore changes too small to see, which rounding would otherwise repeat.
      if (Math.abs(next - current) < 0.005) return
      fitRef.current = next
      setFit(next)
    }

    measure()
    // Sizes change as the container resizes and as the formula's fonts load.
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(content)
    return () => observer.disconnect()
  }, [html, fitHeight])

  return (
    <div ref={containerRef} className={cn('flex min-w-0 max-w-full items-center justify-center', className)}>
      <div
        ref={contentRef}
        className="typlet-formula w-max"
        style={{ fontSize: fontSize * fit }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
