// Formula rendering with Typlet, a JavaScript renderer of Typst math that needs no
// WebAssembly or compiler. It draws a formula as HTML laid out like Typst's own
// output, with MathML for screen readers, and refuses what it can't render yet.
import { renderToString, TypletError, version as typletVersion, type ErrorKind, type RenderOptions, type TypletWarning } from 'typlet'
import type { DiagnosticInfo } from './typstDiagnostics'
import { typletSource, type DocumentIssue, type TypletFormula } from './typletDocument'

export type { DocumentIssue, TypletFormula }

export type TypletResult =
  | { status: 'empty' }
  | {
      status: 'rendered'
      formula: TypletFormula
      /** Typlet's HTML and MathML. */
      html: string
      /** Why Typlet drew the formula as MathML instead of its own layout, if it did. */
      mathmlReason: string | null
    }
  | { status: 'error'; kind: ErrorKind; diagnostics: DiagnosticInfo[] }
  | { status: 'unsupportedDocument'; issue: DocumentIssue }

// Typlet's warning when its HTML can't draw a formula and it shows MathML instead.
const MATHML_FALLBACK = '; drawn as MathML'

/**
 * TypstPad typesets formulas in 24pt text, as it does with typst.ts. Typlet lays
 * out in ems of Typst's default 11pt text, so the preview and the images set the
 * size in Typst and draw Typlet's em at 11 pixels, a pixel per point like the
 * typst.ts images: lengths such as `1pt` then keep their size relative to the text.
 */
export const TYPLET_EM_PX = 11
/** The text size in pixels, which MathML, without Typlet's layout, takes from CSS. */
export const TEXT_SIZE_PX = 24
const TEXT_SIZE = `#set text(size: ${TEXT_SIZE_PX}pt)\n`

function renderOptions(formula: TypletFormula, options: RenderOptions = {}): RenderOptions {
  return {
    displayMode: formula.displayMode,
    preamble: formula.preamble,
    throwOnError: true,
    ...options,
  }
}

/** Options for TypstPad's 24pt text. Markup for web pages takes its size from the page instead. */
function sizedOptions(formula: TypletFormula, options: RenderOptions = {}): RenderOptions {
  return renderOptions({ ...formula, preamble: TEXT_SIZE + (formula.preamble ?? '') }, options)
}

function toDiagnostics(error: TypletError): DiagnosticInfo[] {
  return error.diagnostics.map(diagnostic => ({
    severity: diagnostic.severity,
    message: diagnostic.message,
    hints: [...diagnostic.hints],
  }))
}

/** Renders the editor's content for the preview. */
export function renderTyplet(code: string, simplifiedFormulaMode: boolean): TypletResult {
  const source = typletSource(code, simplifiedFormulaMode)
  switch (source.kind) {
    case 'empty':
      return { status: 'empty' }
    case 'unsupportedDocument':
      return { status: 'unsupportedDocument', issue: source.issue }
    case 'syntaxError':
      return {
        status: 'error',
        kind: 'syntax',
        diagnostics: source.diagnostics.map(d => ({ severity: 'error', message: d.message, hints: d.hints })),
      }
  }

  const warnings: TypletWarning[] = []
  try {
    const html = renderToString(source.formula.formula, sizedOptions(source.formula, {
      // Like the typst.ts preview, the preview shows errors but not warnings.
      strict: (warning) => {
        warnings.push(warning)
        return 'ignore'
      },
    }))
    const fallback = warnings.find(warning => warning.message.endsWith(MATHML_FALLBACK))
    const drawnAsMathml = !html.includes('class="typlet-html"')
    return {
      status: 'rendered',
      formula: source.formula,
      html,
      mathmlReason: drawnAsMathml
        ? fallback?.message.slice(0, -MATHML_FALLBACK.length) ?? ''
        : null,
    }
  } catch (error) {
    if (error instanceof TypletError) {
      return { status: 'error', kind: error.kind, diagnostics: toDiagnostics(error) }
    }
    return { status: 'error', kind: 'eval', diagnostics: [{ severity: 'error', message: String(error), hints: [] }] }
  }
}

/**
 * Typlet's own layout of a formula in 24pt text, as HTML without MathML, with
 * lengths in ems of 11pt. Throws a `TypletError` if Typlet can't draw it.
 */
export function typletLayoutHtml(formula: TypletFormula): string {
  return renderToString(formula.formula, sizedOptions(formula, { output: 'html', strict: 'ignore' }))
}

/** The formula's `<math>` element, which follows Typst's HTML export. */
export function typletMathml(formula: TypletFormula): string {
  const markup = renderToString(formula.formula, renderOptions(formula, { output: 'mathml', strict: 'ignore' }))
  const start = markup.indexOf('<math')
  const end = markup.lastIndexOf('</math>')
  return start === -1 || end === -1 ? markup : markup.slice(start, end + '</math>'.length)
}

/** Typlet's HTML and MathML for a web page, with the stylesheet and fonts it needs. */
export function typletHtmlSnippet(formula: TypletFormula): string {
  const markup = renderToString(formula.formula, renderOptions(formula, { strict: 'ignore' }))
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/typlet@${typletVersion}/fonts/typlet.css">\n${markup}`
}

const symbolCache = new Map<string, string | null>()

/** A picker symbol or template as a display formula, or null if Typlet can't render it. */
export function renderTypletSymbol(code: string): string | null {
  let html = symbolCache.get(code)
  if (html === undefined) {
    try {
      html = renderToString(code, { displayMode: true, throwOnError: true, strict: 'ignore' })
    } catch {
      html = null
    }
    symbolCache.set(code, html)
  }
  return html
}
