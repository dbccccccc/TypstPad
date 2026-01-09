/**
 * Sanitize SVG string to ensure valid XML parsing.
 *
 * Typst-generated SVG may contain unescaped `&` characters. Browsers often parse
 * inline SVG in HTML leniently, but `data:image/svg+xml` (used by `<img>`) is
 * parsed as XML and is stricter.
 */
export function sanitizeSvgForXml(svgString: string): string {
  // Convert unescaped & to &amp; (excluding existing entity references like &amp; &lt; &gt; &quot; &apos; &#xxx;)
  return svgString.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
}

export function svgToDataUri(svgString: string): string {
  const cleanSvg = sanitizeSvgForXml(svgString)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg)}`
}

