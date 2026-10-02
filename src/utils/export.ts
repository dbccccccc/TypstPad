import { sanitizeSvgForXml } from './svg'

// Some browsers, notably Safari, start the download after the click returns and
// fail if its object URL has already been revoked.
const REVOKE_URL_DELAY_MS = 40_000

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_DELAY_MS)
}

/**
 * Download text file
 */
export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  downloadBlob(new Blob([content], { type: mimeType }), filename)
}

/**
 * Download SVG file
 */
export function downloadSVG(svgString: string, filename = 'formula.svg') {
  const cleanSvg = sanitizeSvgForXml(svgString)
  downloadBlob(new Blob([cleanSvg], { type: 'image/svg+xml' }), filename)
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
export async function downloadPNG(svgString: string, filename = 'formula.png', scale = 2): Promise<void> {
  downloadBlob(await svgToPngBlob(svgString, scale), filename)
}

/**
 * Convert SVG to PNG Blob
 */
function svgToPngBlob(svgString: string, scale = 2, backgroundColor?: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const cleanSvg = sanitizeSvgForXml(svgString)
    const { width, height } = getSvgDimensions(cleanSvg)
    const img = new Image()

    // Load SVG using data URL to avoid CORS/COEP issues
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg)

    img.onload = () => {
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
      reject(new Error('Failed to load SVG image'))
    }

    img.src = dataUrl
  })
}

/**
 * Copy PNG image to clipboard
 */
export async function copyPNGToClipboard(svgString: string, scale = 2): Promise<boolean> {
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== 'function' ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false
  }
  try {
    // Pass the pending image instead of awaiting it first: Safari only allows
    // clipboard writes that start while handling the click.
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': svgToPngBlob(svgString, scale) })
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
  downloadBlob(await svgToPngBlob(svgString, scale, '#ffffff'), filename)
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
