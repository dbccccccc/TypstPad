import { decodeBase64Utf8, encodeBase64Utf8 } from './base64'

const FORMULA_PARAM = 'formula'
const MODE_PARAM = 'mode'
const SIMPLIFIED_MODE = 'simplified'
const TYPST_MODE = 'typst'

export interface SharedFormula {
  code: string
  /** The formula mode the link was created in; undefined for older links. */
  simplifiedFormulaMode?: boolean
}

/**
 * Build the query string for a shared formula. The mode is included because
 * the same source means different things in simplified and plain Typst mode.
 */
export function createShareQuery(code: string, simplifiedFormulaMode: boolean): string {
  const mode = simplifiedFormulaMode ? SIMPLIFIED_MODE : TYPST_MODE
  return `?${FORMULA_PARAM}=${encodeURIComponent(encodeBase64Utf8(code))}&${MODE_PARAM}=${mode}`
}

/**
 * Generate share URL
 */
export function generateShareUrl(code: string, simplifiedFormulaMode: boolean): string {
  return `${window.location.origin}${window.location.pathname}${createShareQuery(code, simplifiedFormulaMode)}`
}

/**
 * Decode a shared formula from a query string
 */
export function parseSharedFormula(search: string): SharedFormula | null {
  const params = new URLSearchParams(search)
  const encoded = params.get(FORMULA_PARAM)
  if (!encoded) return null

  let code: string
  try {
    code = decodeBase64Utf8(encoded)
  } catch {
    return null
  }

  const mode = params.get(MODE_PARAM)
  return {
    code,
    simplifiedFormulaMode: mode === SIMPLIFIED_MODE ? true : mode === TYPST_MODE ? false : undefined,
  }
}

/**
 * Read the shared formula and remove it from the address bar, so reloading
 * restores the autosaved draft instead of reopening the original link.
 */
export function takeSharedFormulaFromUrl(): SharedFormula | null {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(FORMULA_PARAM)) return null

  const shared = parseSharedFormula(url.search)
  url.searchParams.delete(FORMULA_PARAM)
  url.searchParams.delete(MODE_PARAM)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return shared
}
