// Image exports drawn from Typlet's own layout. Typlet has no SVG output yet, so
// these read its HTML layout into a scene (see typletScene.ts) and draw it: as SVG
// text that embeds the subsets of Typlet's font the formula uses, and onto a canvas
// for PNG and JPG. Experimental: the HTML layout is Typlet's output, not a
// documented format, and SVG with embedded web fonts shows correctly in browsers,
// but not in every editor or office application.
import { TEXT_SIZE_PX, TYPLET_EM_PX, typletLayoutHtml, type TypletFormula } from './typlet'
import { parseTypletLayout, type Box, type GlyphRun, type Rule, type Scene, type SceneColor } from './typletScene'

/** Pixels per Typlet em in exported images: a pixel per point, like the typst.ts images. */
export const EXPORT_EM_PX = TYPLET_EM_PX
/** The space around exported formulas in pixels: the typst.ts page margin, half an em of 24pt text. */
export const EXPORT_MARGIN_PX = TEXT_SIZE_PX / 2

const FONT_FAMILY = 'Typlet NewCM Math'
const BLACK = '#000000'

export interface GlyphMetrics {
  /** A glyph's advance, in ems of its font size. */
  advance(char: string, bold: boolean): number
}

/** Where each glyph of a run starts: glyphs follow one another at their advances. */
export function placeGlyphs(run: GlyphRun, metrics: GlyphMetrics): Array<{ char: string; x: number }> {
  const glyphs: Array<{ char: string; x: number }> = []
  let x = run.x
  for (const char of run.text) {
    glyphs.push({ char, x })
    x += metrics.advance(char, run.bold) * run.size
  }
  return glyphs
}

/** Maps scene positions to pixels. */
interface Viewport {
  /** Pixels per em. */
  scale: number
  /** The space around the scene, in pixels. */
  margin: number
}

const toPixels = (value: number, view: Viewport) => value * view.scale + view.margin

function format(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

function sceneSize(scene: Scene, view: Viewport) {
  return {
    width: scene.width * view.scale + 2 * view.margin,
    height: scene.height * view.scale + 2 * view.margin,
  }
}

/** A rectangle with rounded corners as SVG path data, in pixels. */
function roundedRectPath(x: number, y: number, width: number, height: number, radii: number[]): string {
  const limit = Math.max(0, Math.min(width, height) / 2)
  const [tl, tr, br, bl] = radii.map(radius => Math.max(0, Math.min(radius, limit)))
  const f = format
  const arc = (radius: number, toX: number, toY: number) => (radius > 0 ? `A${f(radius)} ${f(radius)} 0 0 1 ${f(toX)} ${f(toY)}` : '')
  return [
    `M${f(x + tl)} ${f(y)}`,
    `H${f(x + width - tr)}`, arc(tr, x + width, y + tr),
    `V${f(y + height - br)}`, arc(br, x + width - br, y + height),
    `H${f(x + bl)}`, arc(bl, x, y + height - bl),
    `V${f(y + tl)}`, arc(tl, x + tl, y),
    'Z',
  ].join('')
}

interface Stroke {
  path: string
  width: number
  color: SceneColor
  dash: number[] | null
}

/**
 * A box's borders as strokes along paths, in pixels. CSS draws them inside the
 * box, so each path runs along the middle of its border.
 */
function boxStrokes(box: Box, view: Viewport): Stroke[] {
  const [top, right, bottom, left] = box.borders
  const x = toPixels(box.x, view)
  const y = toPixels(box.y, view)
  const width = box.width * view.scale
  const height = box.height * view.scale
  // CSS spaces dashes by their thickness; the exact pattern varies by browser.
  const dash = (thickness: number) => [2 * thickness, thickness]
  const uniform = box.borders.every(side => side.width === top.width && side.dashed === top.dashed && side.color === top.color)
  if (uniform) {
    if (top.width <= 0) return []
    const thickness = top.width * view.scale
    const half = thickness / 2
    const radii = box.radii.map(radius => Math.max(0, radius * view.scale - half))
    return [{
      path: roundedRectPath(x + half, y + half, width - thickness, height - thickness, radii),
      width: thickness,
      color: top.color,
      dash: top.dashed ? dash(thickness) : null,
    }]
  }
  const f = format
  const sides = [
    { side: top, path: (t: number) => `M${f(x)} ${f(y + t / 2)}H${f(x + width)}` },
    { side: right, path: (t: number) => `M${f(x + width - t / 2)} ${f(y)}V${f(y + height)}` },
    { side: bottom, path: (t: number) => `M${f(x)} ${f(y + height - t / 2)}H${f(x + width)}` },
    { side: left, path: (t: number) => `M${f(x + t / 2)} ${f(y)}V${f(y + height)}` },
  ]
  return sides
    .filter(({ side }) => side.width > 0)
    .map(({ side, path }) => {
      const thickness = side.width * view.scale
      return { path: path(thickness), width: thickness, color: side.color, dash: side.dashed ? dash(thickness) : null }
    })
}

function boxFillPath(box: Box, view: Viewport): string {
  return roundedRectPath(
    toPixels(box.x, view),
    toPixels(box.y, view),
    box.width * view.scale,
    box.height * view.scale,
    box.radii.map(radius => radius * view.scale),
  )
}

const cssColor = (color: SceneColor) => (color === 'currentColor' ? BLACK : color)

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escapeXml(text: string): string {
  return text.replace(/[&<>"]/g, char => XML_ESCAPES[char])
}

/** An SVG paint attribute. Colors with alpha become an opacity, which more applications read. */
function svgPaint(attribute: 'fill' | 'stroke', color: SceneColor): string {
  const value = cssColor(color)
  const alpha = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(value)
  if (alpha) return ` ${attribute}="#${alpha[1]}" ${attribute}-opacity="${format(Number.parseInt(alpha[2], 16) / 255)}"`
  return ` ${attribute}="${escapeXml(value)}"`
}

function svgRule(rule: Rule, view: Viewport): string {
  const x = toPixels(rule.x, view)
  const middle = toPixels(rule.y + rule.height / 2, view)
  // CSS rotates rules about the middle of their left edge.
  const rotate = rule.angle ? ` transform="rotate(${format((rule.angle * 180) / Math.PI)} ${format(x)} ${format(middle)})"` : ''
  if (rule.dash) {
    const array = rule.dash.array.map(length => format(length * view.scale)).join(' ')
    return `<line x1="${format(x)}" y1="${format(middle)}" x2="${format(x + rule.width * view.scale)}" y2="${format(middle)}"`
      + `${svgPaint('stroke', rule.color)} stroke-width="${format(rule.height * view.scale)}"`
      + ` stroke-dasharray="${array}" stroke-dashoffset="${format(rule.dash.offset * view.scale)}"${rotate}/>`
  }
  return `<rect x="${format(x)}" y="${format(toPixels(rule.y, view))}" width="${format(rule.width * view.scale)}"`
    + ` height="${format(rule.height * view.scale)}"${svgPaint('fill', rule.color)}${rotate}/>`
}

function svgBox(box: Box, view: Viewport): string {
  let out = box.fill ? `<path d="${boxFillPath(box, view)}"${svgPaint('fill', box.fill)}/>` : ''
  for (const stroke of boxStrokes(box, view)) {
    out += `<path d="${stroke.path}" fill="none"${svgPaint('stroke', stroke.color)} stroke-width="${format(stroke.width)}"`
      + `${stroke.dash ? ` stroke-dasharray="${stroke.dash.map(format).join(' ')}"` : ''}/>`
  }
  return out
}

function svgGlyphs(run: GlyphRun, metrics: GlyphMetrics, view: Viewport): string {
  const size = format(run.size * view.scale)
  const attributes = `${run.bold ? ' font-weight="bold"' : ''}${run.color === 'currentColor' ? '' : svgPaint('fill', run.color)}`
  const y = format(toPixels(run.y, view))
  // One element per glyph places each at its advance in every application.
  return placeGlyphs(run, metrics)
    .filter(glyph => glyph.char.trim())
    .map(glyph => `<text x="${format(toPixels(glyph.x, view))}" y="${y}" font-size="${size}"${attributes}>${escapeXml(glyph.char)}</text>`)
    .join('')
}

/** A scene as a standalone SVG image, with `fontCss` declaring the fonts it embeds. */
export function sceneToSvg(scene: Scene, metrics: GlyphMetrics, fontCss: string): string {
  const view: Viewport = { scale: EXPORT_EM_PX, margin: EXPORT_MARGIN_PX }
  const { width, height } = sceneSize(scene, view)
  const body = scene.items.map(item => {
    switch (item.type) {
      case 'glyphs':
        return svgGlyphs(item, metrics, view)
      case 'rule':
        return svgRule(item, view)
      case 'box':
        return svgBox(item, view)
    }
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${format(width)}" height="${format(height)}" viewBox="0 0 ${format(width)} ${format(height)}">`
    + `<style>${fontCss}text{font-family:"${FONT_FAMILY}";white-space:pre}</style>`
    + `<g fill="${BLACK}" font-family="'${FONT_FAMILY}'">${body}</g></svg>`
}

function drawScene(context: CanvasRenderingContext2D, scene: Scene, metrics: GlyphMetrics, view: Viewport) {
  for (const item of scene.items) {
    context.save()
    if (item.type === 'glyphs') {
      context.font = `${item.bold ? 'bold ' : ''}${item.size * view.scale}px "${FONT_FAMILY}"`
      context.fillStyle = cssColor(item.color)
      const y = toPixels(item.y, view)
      for (const glyph of placeGlyphs(item, metrics)) {
        if (glyph.char.trim()) context.fillText(glyph.char, toPixels(glyph.x, view), y)
      }
    } else if (item.type === 'rule') {
      context.translate(toPixels(item.x, view), toPixels(item.y + item.height / 2, view))
      context.rotate(item.angle)
      const width = item.width * view.scale
      const height = item.height * view.scale
      if (item.dash) {
        context.setLineDash(item.dash.array.map(length => length * view.scale))
        context.lineDashOffset = item.dash.offset * view.scale
        context.lineWidth = height
        context.strokeStyle = cssColor(item.color)
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(width, 0)
        context.stroke()
      } else {
        context.fillStyle = cssColor(item.color)
        context.fillRect(0, -height / 2, width, height)
      }
    } else {
      if (item.fill) {
        context.fillStyle = cssColor(item.fill)
        context.fill(new Path2D(boxFillPath(item, view)))
      }
      for (const stroke of boxStrokes(item, view)) {
        context.strokeStyle = cssColor(stroke.color)
        context.lineWidth = stroke.width
        context.setLineDash(stroke.dash ?? [])
        context.stroke(new Path2D(stroke.path))
      }
    }
    context.restore()
  }
}

/** Parses a CSS `unicode-range` into inclusive ranges of code points. */
export function parseUnicodeRange(value: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  for (const match of value.matchAll(/U\+([0-9a-f?]+)(?:-([0-9a-f]+))?/gi)) {
    const [, start, end] = match
    if (start.includes('?')) {
      ranges.push([Number.parseInt(start.replace(/\?/g, '0'), 16), Number.parseInt(start.replace(/\?/g, 'f'), 16)])
    } else {
      ranges.push([Number.parseInt(start, 16), Number.parseInt(end ?? start, 16)])
    }
  }
  return ranges
}

interface TypletFontFace {
  url: string
  bold: boolean
  unicodeRange: string
  ranges: Array<[number, number]>
}

// The page loads Typlet's fonts from typlet.css; reading its @font-face rules finds
// the files wherever the build put them.
function typletFontFaces(): TypletFontFace[] {
  const faces: TypletFontFace[] = []
  const visit = (rules: CSSRuleList, base: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) {
        const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim()
        const source = /url\((["']?)(.*?)\1\)/.exec(rule.style.getPropertyValue('src'))
        if (family !== FONT_FAMILY || !source) continue
        const weight = rule.style.getPropertyValue('font-weight').trim()
        const unicodeRange = rule.style.getPropertyValue('unicode-range').trim() || 'U+0-10FFFF'
        faces.push({
          url: new URL(source[2], base).href,
          bold: weight === 'bold' || Number(weight) >= 600,
          unicodeRange,
          ranges: parseUnicodeRange(unicodeRange),
        })
      } else if ('cssRules' in rule) {
        visit((rule as CSSGroupingRule).cssRules, base)
      }
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    visit(rules, sheet.href ?? document.baseURI)
  }
  return faces
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

const fontData = new Map<string, Promise<string>>()

function fontBase64(url: string): Promise<string> {
  let data = fontData.get(url)
  if (!data) {
    // The build inlines the smallest font files as base64 data URLs.
    data = url.startsWith('data:')
      ? Promise.resolve(url.slice(url.indexOf(',') + 1))
      : fetch(url).then(async (response) => {
          if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status})`)
          return bytesToBase64(new Uint8Array(await response.arrayBuffer()))
        })
    data.catch(() => fontData.delete(url))
    fontData.set(url, data)
  }
  return data
}

function glyphRuns(scene: Scene): GlyphRun[] {
  return scene.items.filter((item): item is GlyphRun => item.type === 'glyphs')
}

/** @font-face rules that embed the font files a scene's glyphs need. */
async function embeddedFontCss(scene: Scene): Promise<string> {
  const faces = typletFontFaces()
  const covers = (face: TypletFontFace, codePoint: number) => face.ranges.some(([start, end]) => codePoint >= start && codePoint <= end)
  const needed = new Set<TypletFontFace>()
  for (const run of glyphRuns(scene)) {
    for (const char of run.text) {
      const codePoint = char.codePointAt(0)!
      // Browsers make bold from the regular face when no bold face has the glyph.
      const face = faces.find(candidate => candidate.bold === run.bold && covers(candidate, codePoint))
        ?? faces.find(candidate => !candidate.bold && covers(candidate, codePoint))
      if (face) needed.add(face)
    }
  }
  const rules = await Promise.all([...needed].map(async face => (
    `@font-face{font-family:"${FONT_FAMILY}";src:url(data:font/woff2;base64,${await fontBase64(face.url)}) format("woff2");`
    + `${face.bold ? 'font-weight:bold;' : ''}unicode-range:${face.unicodeRange}}`
  )))
  return rules.join('')
}

const fontSpec = (bold: boolean, size: number) => `${bold ? 'bold ' : ''}${size}px "${FONT_FAMILY}"`

/** Loads the font files a scene needs and measures its glyphs with them. */
async function loadGlyphMetrics(scene: Scene): Promise<GlyphMetrics> {
  const runs = glyphRuns(scene)
  await Promise.all([false, true].map((bold) => {
    const text = runs.filter(run => run.bold === bold).map(run => run.text).join('')
    return text ? document.fonts.load(fontSpec(bold, 32), text) : null
  }))
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('Canvas is not available.')
  const advances = new Map<string, number>()
  return {
    advance(char, bold) {
      const key = `${bold ? 'b' : 'r'}${char}`
      let advance = advances.get(key)
      if (advance === undefined) {
        context.font = fontSpec(bold, 100)
        advance = context.measureText(char).width / 100
        advances.set(key, advance)
      }
      return advance
    },
  }
}

/** The formula as an SVG image with Typlet's fonts embedded. Throws a `TypletError` if Typlet can't draw it. */
export async function typletSvg(formula: TypletFormula): Promise<string> {
  const scene = parseTypletLayout(typletLayoutHtml(formula))
  const [metrics, fontCss] = await Promise.all([loadGlyphMetrics(scene), embeddedFontCss(scene)])
  return sceneToSvg(scene, metrics, fontCss)
}

/**
 * The formula as a PNG image, or a JPG on `background`, drawn on a canvas with
 * the page's fonts. Throws a `TypletError` if Typlet can't draw it.
 */
export async function typletImage(formula: TypletFormula, scale: number, background?: string): Promise<Blob> {
  const scene = parseTypletLayout(typletLayoutHtml(formula))
  const metrics = await loadGlyphMetrics(scene)
  const view: Viewport = { scale: EXPORT_EM_PX * scale, margin: EXPORT_MARGIN_PX * scale }
  const { width, height } = sceneSize(scene, view)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available.')
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  drawScene(context, scene, metrics, view)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Failed to create the image.'))),
      background ? 'image/jpeg' : 'image/png',
      0.95,
    )
  })
}
