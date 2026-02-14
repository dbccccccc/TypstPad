import { useEffect, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, ArrowRight, ExternalLink } from 'lucide-react'
import { DiagnosticInfo } from '../../services/typst'
import { Button } from '../ui/button'
import { useI18n } from '@/i18n'

interface ErrorDisplayProps {
  diagnostics: DiagnosticInfo[]
}

// Render hint text with code highlighting for backtick-enclosed content
function renderHintWithCode(hint: string) {
  const parts = hint.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1)
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-mono"
        >
          {code}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function ErrorDisplay({ diagnostics }: ErrorDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { t } = useI18n()

  useEffect(() => {
    if (diagnostics.length === 0) {
      setCurrentIndex(0)
      return
    }
    if (currentIndex < diagnostics.length) return
    setCurrentIndex(diagnostics.length - 1)
  }, [currentIndex, diagnostics.length])

  if (diagnostics.length === 0) return null

  const safeIndex = Math.min(currentIndex, diagnostics.length - 1)
  const current = diagnostics[safeIndex]
  const hasMultiple = diagnostics.length > 1

  const goToPrev = () => {
    setCurrentIndex(i => (i > 0 ? i - 1 : diagnostics.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex(i => (i < diagnostics.length - 1 ? i + 1 : 0))
  }

  return (
    <div className="w-full max-w-[600px] rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-red-50">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">
            {t('error.title')}
          </span>
          {hasMultiple && (
            <span className="text-xs text-red-500 bg-red-100 px-1.5 py-0.5 rounded">
              {safeIndex + 1}/{diagnostics.length}
            </span>
          )}
        </div>
        {hasMultiple && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Error Message */}
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            {t('error.messageLabel')}
          </div>
          <div className="text-sm text-slate-800 leading-relaxed">
            {current.message}
          </div>
        </div>

        {/* Hints */}
        {current.hints.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              {t('error.howToFix')}
            </div>
            <div className="space-y-2.5">
              {current.hints.map((hint, index) => (
                <div key={index} className="flex items-start gap-2.5 text-sm">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <span className="text-slate-700 leading-relaxed">
                    {renderHintWithCode(hint)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation Link */}
        <div className="pt-3 border-t border-slate-100">
          <a
            href="https://typst.app/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('error.documentation')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay
