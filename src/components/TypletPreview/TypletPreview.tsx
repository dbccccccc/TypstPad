import { History } from 'lucide-react'
import ErrorDisplay from '../ErrorDisplay'
import TypletFormula from '../TypletFormula/TypletFormula'
import { Button } from '../ui/button'
import { TEXT_SIZE_PX, TYPLET_EM_PX, type TypletResult } from '../../services/typlet'
import { useI18n } from '@/i18n'

interface TypletPreviewProps {
  result: TypletResult
  onUseLegacy: () => void
}

function TypletPreview({ result, onUseLegacy }: TypletPreviewProps) {
  const { t } = useI18n()

  const legacyButton = (
    <Button variant="outline" size="sm" onClick={onUseLegacy} className="gap-2 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900">
      <History className="h-4 w-4" />
      {t('typlet.useLegacy')}
    </Button>
  )

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0 gap-3">
      {result.status === 'empty' && (
        <div className="text-muted-foreground text-sm text-center">
          {t('preview.empty')}
        </div>
      )}
      {result.status === 'rendered' && (
        // Typlet draws in the text color; the preview is black on white, like the typst.ts image.
        // Its layout is in ems of 11pt with 24pt text; MathML takes the text size from CSS.
        <TypletFormula
          html={result.html}
          fontSize={result.mathmlReason === null ? TYPLET_EM_PX : TEXT_SIZE_PX}
          className="w-full text-black"
        />
      )}
      {result.status === 'error' && (
        <>
          <ErrorDisplay diagnostics={result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')} />
          {/* Typst supports what Typlet refuses, so the compiler can render it. */}
          {(result.kind === 'unsupported' || result.kind === 'limit') && legacyButton}
        </>
      )}
      {result.status === 'unsupportedDocument' && (
        <>
          <ErrorDisplay
            diagnostics={[{
              severity: 'error',
              message: t(`typlet.document.${result.issue}`),
              hints: [t('typlet.document.hint')],
            }]}
          />
          {legacyButton}
        </>
      )}
    </div>
  )
}

export default TypletPreview
