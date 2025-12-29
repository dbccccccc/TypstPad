import { decodeBase64Utf8, encodeBase64Utf8 } from './base64'

/**
 * Generate share URL
 */
export function generateShareUrl(code: string): string {
  const base64 = encodeBase64Utf8(code)
  return `${window.location.origin}${window.location.pathname}?formula=${encodeURIComponent(base64)}`
}

/**
 * Decode formula from URL
 */
export function getFormulaFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('formula')
  if (!encoded) return null

  try {
    return decodeBase64Utf8(encoded)
  } catch {
    return null
  }
}
