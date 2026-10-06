import ExportPanel from './ExportPanel'
import { typletHtmlSnippet, typletMathml, type TypletFormula, type TypletResult } from '@/services/typlet'
import { typletImage, typletSvg } from '@/services/typletExport'
import { copyToClipboard, downloadBlob, downloadSVG, downloadText, ExportError } from '@/utils/export'
import { generateShareUrl } from '@/utils/share'
import { useI18n } from '@/i18n'

interface TypletExportPanelProps {
  result: TypletResult
  code: string
  simplifiedFormulaMode: boolean
  pngScale: number
  buildFormulaImageHtml: (svg: string) => string
  buildFormulaDocumentHtml: (svg: string) => string
}

// Safari allows clipboard writes only while it handles the click, so content that
// is still being made goes to the clipboard as a pending item.
async function copyPendingImage(image: Promise<Blob>): Promise<boolean> {
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== 'function' ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
    return true
  } catch (error) {
    console.error('Failed to copy PNG to clipboard:', error)
    return false
  }
}

async function copyPendingText(text: Promise<string>): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = text.then(value => new Blob([value], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      return true
    } catch {
      // Copy the finished text instead.
    }
  }
  return copyToClipboard(await text)
}

/** Exports drawn from Typlet's layout, with the formats only Typlet offers. */
export default function TypletExportPanel({
  result,
  code,
  simplifiedFormulaMode,
  pngScale,
  buildFormulaImageHtml,
  buildFormulaDocumentHtml,
}: TypletExportPanelProps) {
  const { t } = useI18n()
  const rendered = result.status === 'rendered' ? result : null

  // The panel is disabled until Typlet renders the formula.
  const formula = (): TypletFormula => {
    if (!rendered) throw new ExportError(t('export.error.downloadFailed'))
    return rendered.formula
  }

  // Images are drawn from Typlet's own layout, which formulas drawn as MathML lack.
  const layoutFormula = (): TypletFormula => {
    const current = formula()
    if (rendered?.mathmlReason != null) {
      throw new ExportError(t('typlet.exportUnavailable', { reason: rendered.mathmlReason }))
    }
    return current
  }

  return (
    <ExportPanel
      disabled={!rendered}
      code={code}
      pngScale={pngScale}
      onDownloadPNG={async () => {
        downloadBlob(await typletImage(layoutFormula(), pngScale), 'formula.png')
      }}
      onDownloadJPG={async () => {
        downloadBlob(await typletImage(layoutFormula(), pngScale, '#ffffff'), 'formula.jpg')
      }}
      onDownloadSVG={async () => {
        downloadSVG(await typletSvg(layoutFormula()))
      }}
      onCopyPNG={() => copyPendingImage(typletImage(layoutFormula(), pngScale))}
      onCopyTypst={() => copyToClipboard(code)}
      onDownloadTypst={() => downloadText(code, 'formula.typ')}
      onCopySVG={() => copyPendingText(typletSvg(layoutFormula()))}
      onCopyHTML={() => copyPendingText(typletSvg(layoutFormula()).then(buildFormulaImageHtml))}
      onDownloadHTML={async () => {
        downloadText(buildFormulaDocumentHtml(await typletSvg(layoutFormula())), 'formula.html', 'text/html')
      }}
      onCopyShareLink={() => copyToClipboard(generateShareUrl(code, simplifiedFormulaMode))}
      onCopyMathML={() => copyToClipboard(typletMathml(formula()))}
      onCopyTypletHTML={() => copyToClipboard(typletHtmlSnippet(formula()))}
    />
  )
}
