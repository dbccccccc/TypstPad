/**
 * Generate share URL
 */
export function generateShareUrl(code: string): string {
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(code))))
  return `${window.location.origin}${window.location.pathname}?formula=${encoded}`
}

/**
 * Decode formula from URL
 */
export function getFormulaFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('formula')
  if (encoded) {
    try {
      return decodeURIComponent(escape(atob(decodeURIComponent(encoded))))
    } catch {
      return null
    }
  }
  return null
}
