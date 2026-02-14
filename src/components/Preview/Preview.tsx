import { useEffect, useRef, useState } from 'react'
import { compileTypst, DiagnosticInfo, subscribeToLoadingProgress, type LoadingPhase as TypstLoadingPhase } from '../../services/typst'
import { svgToDataUri } from '../../utils/svg'
import ErrorDisplay from '../ErrorDisplay'
import { useI18n } from '@/i18n'

type LoadingPhase = TypstLoadingPhase | 'compiling'

interface LoadingProgress {
  phase: LoadingPhase
  loaded?: number
  total?: number
}

interface PreviewProps {
  code: string
  onCompiled?: (svg: string | null, diagnostics: DiagnosticInfo[] | null) => void
  simplifiedFormulaMode?: boolean
  fontRevision?: number
}

function Preview({ code, onCompiled, simplifiedFormulaMode, fontRevision }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const compileIdRef = useRef(0)
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo[] | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState<LoadingProgress | null>(null)
  const { t, formatNumber } = useI18n()

  useEffect(() => {
    // Set up loading progress callback
    const unsubscribe = subscribeToLoadingProgress((progress) => {
      setLoading(progress)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const compileId = ++compileIdRef.current
    const debounceMs = 200
    let active = true

    const timeoutId = window.setTimeout(async () => {
      setLoading({ phase: 'compiling' })
      const result = await compileTypst(code, {
        simplifiedFormulaMode,
      })

      if (!active || compileId !== compileIdRef.current) return

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
      active = false
      compileIdRef.current += 1
      window.clearTimeout(timeoutId)
    }
  }, [code, onCompiled, simplifiedFormulaMode, fontRevision])

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${formatNumber(bytes)} B`
    if (bytes < 1024 * 1024) {
      return `${formatNumber(bytes / 1024, { maximumFractionDigits: 1 })} KB`
    }
    return `${formatNumber(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} MB`
  }

  const getLoadingLabel = (progress: LoadingProgress) => {
    switch (progress.phase) {
      case 'compiling':
        return t('preview.loading.compiling')
      case 'loadingCompiler':
        return t('preview.loading.loadingCompiler')
      case 'loadingRenderer':
        return t('preview.loading.loadingRenderer')
      case 'loadingFonts': {
        const loaded = progress.loaded ?? 0
        const total = progress.total ?? 0
        return t('preview.loading.loadingFonts', {
          loaded: formatNumber(loaded),
          total: formatNumber(total),
        })
      }
      case 'initializing':
        return t('preview.loading.initializing')
      case 'ready':
        return t('preview.loading.ready')
      default:
        return t('common.loading')
    }
  }

  const errorDiagnostics = diagnostics?.filter(diagnostic => diagnostic.severity === 'error') ?? []
  const hasErrors = errorDiagnostics.length > 0

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0 gap-3" ref={containerRef}>
      {/* Loading indicator */}
      {loading && (
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <div className="text-sm">{getLoadingLabel(loading)}</div>
          {loading.loaded !== undefined && loading.total !== undefined && loading.total > 0 && (
            <div className="text-xs tabular-nums">
              {formatBytes(loading.loaded)} / {formatBytes(loading.total)} ({Math.round((loading.loaded / loading.total) * 100)}%)
            </div>
          )}
        </div>
      )}
      {!loading && hasErrors && (
        <ErrorDisplay diagnostics={errorDiagnostics} />
      )}
      {!loading && !hasErrors && svg && (
        <img
          src={svgToDataUri(svg)}
          alt={t('preview.alt')}
          className="block w-auto h-auto max-w-full max-h-full"
        />
      )}
      {!loading && !hasErrors && !svg && (
        <div className="text-muted-foreground text-sm text-center">
          {t('preview.empty')}
        </div>
      )}
    </div>
  )
}

export default Preview
