/**
 * Download text file
 */
export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Sanitize SVG string to ensure valid XML
 */
function sanitizeSvg(svgString: string): string {
  // Convert unescaped & to &amp; (excluding existing entity references like &amp; &lt; &gt; &quot; &apos; &#xxx;)
  return svgString.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
}

/**
 * Download SVG file
 */
export function downloadSVG(svgString: string, filename = 'formula.svg') {
  const cleanSvg = sanitizeSvg(svgString)
  const blob = new Blob([cleanSvg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse dimensions from SVG string
 */
function getSvgDimensions(svgString: string): { width: number; height: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')

  if (!svgEl) {
    return { width: 300, height: 150 }
  }

  // Try to get from width/height attributes
  let width = parseFloat(svgEl.getAttribute('width') || '0')
  let height = parseFloat(svgEl.getAttribute('height') || '0')

  // If not available, try to get from viewBox
  if (!width || !height) {
    const viewBox = svgEl.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/)
      if (parts.length >= 4) {
        width = parseFloat(parts[2]) || 300
        height = parseFloat(parts[3]) || 150
      }
    }
  }

  return { width: width || 300, height: height || 150 }
}

/**
 * Download PNG file
 */
export function downloadPNG(svgString: string, filename = 'formula.png', scale = 2): Promise<void> {
  return new Promise((resolve, reject) => {
    // First sanitize SVG
    const cleanSvg = sanitizeSvg(svgString)
    const { width, height } = getSvgDimensions(cleanSvg)
    const img = new Image()

    // Load SVG using Object URL (avoids deprecated escape/unescape)
    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' })
    const objectUrl = URL.createObjectURL(svgBlob)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = filename
          a.click()
          URL.revokeObjectURL(pngUrl)
          resolve()
        } else {
          reject(new Error('Failed to create PNG blob'))
        }
      }, 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load SVG image'))
    }

    img.src = objectUrl
  })
}

/**
 * Convert SVG to PNG Blob
 */
function svgToPngBlob(svgString: string, scale = 2, backgroundColor?: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const cleanSvg = sanitizeSvg(svgString)
    const { width, height } = getSvgDimensions(cleanSvg)
    const img = new Image()

    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' })
    const objectUrl = URL.createObjectURL(svgBlob)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Fill background color if specified
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, backgroundColor ? 'image/jpeg' : 'image/png', 0.95)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load SVG image'))
    }
    img.src = objectUrl
  })
}

/**
 * Copy PNG image to clipboard
 */
export async function copyPNGToClipboard(svgString: string, scale = 2): Promise<boolean> {
  try {
    const blob = await svgToPngBlob(svgString, scale)
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    return true
  } catch (error) {
    console.error('Failed to copy PNG to clipboard:', error)
    return false
  }
}

/**
 * Download JPG file (with white background)
 */
export async function downloadJPG(svgString: string, filename = 'formula.jpg', scale = 2): Promise<void> {
  const blob = await svgToPngBlob(svgString, scale, '#ffffff')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback method
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}
