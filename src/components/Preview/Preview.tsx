import { useEffect, useRef, useState } from 'react'
import { compileTypst, DiagnosticInfo, setLoadingProgressCallback } from '../../services/typst'
import ErrorDisplay from '../ErrorDisplay'

interface LoadingProgress {
  phase: string
  loaded?: number
  total?: number
}

interface PreviewProps {
  code: string
  onCompiled?: (svg: string | null, diagnostics: DiagnosticInfo[] | null) => void
}

function Preview({ code, onCompiled }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const compileIdRef = useRef(0)
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo[] | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState<LoadingProgress | null>(null)

  useEffect(() => {
    // Set up loading progress callback
    setLoadingProgressCallback((progress) => {
      setLoading(progress)
    })

    return () => {
      setLoadingProgressCallback(null)
    }
  }, [])

  useEffect(() => {
    const compileId = ++compileIdRef.current
    const debounceMs = 200

    const timeoutId = window.setTimeout(async () => {
      setLoading({ phase: 'Compiling...' })
      const result = await compileTypst(code)

      if (compileId !== compileIdRef.current) return

      setLoading(null) // Clear loading state after compilation

      if (result.success && result.svg) {
        setSvg(result.svg)
        setDiagnostics(null)
        onCompiled?.(result.svg, null)
      } else {
        setSvg(null)
        setDiagnostics(result.diagnostics || null)
        onCompiled?.(null, result.diagnostics || null)
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [code, onCompiled])

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex-1 flex items-center justify-center w-full min-w-0" ref={containerRef}>
      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <div className="text-sm">{loading.phase}</div>
          {loading.loaded !== undefined && loading.total !== undefined && loading.total > 0 && (
            <div className="text-xs tabular-nums">
              {formatBytes(loading.loaded)} / {formatBytes(loading.total)} ({Math.round((loading.loaded / loading.total) * 100)}%)
            </div>
          )}
        </div>
      )}
      {!loading && diagnostics && diagnostics.length > 0 && (
        <ErrorDisplay diagnostics={diagnostics} />
      )}
      {!loading && !diagnostics && svg && (
        <div
          className="flex items-center justify-center [&_svg]:block [&_svg]:w-auto [&_svg]:h-auto [&_svg]:text-[32px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {!loading && !diagnostics && !svg && (
        <div className="text-muted-foreground text-sm text-center">
          No preview content
        </div>
      )}
    </div>
  )
}

export default Preview
