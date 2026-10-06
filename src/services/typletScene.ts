// Typlet's HTML output places every glyph, rule and box at an explicit position in
// ems: each piece of a formula is an inline-block frame on the baseline, and its
// glyph runs, rules and boxes are absolutely positioned inside it. This module
// reads that markup back into a scene of positioned shapes, which the exports
// draw as SVG or onto a canvas. Lengths are in ems of the formula's font size.

/** A CSS color, or `currentColor` for the text's color. */
export type SceneColor = string

export interface GlyphRun {
  type: 'glyphs'
  /** The start of the run's baseline. */
  x: number
  y: number
  /** The font size, relative to the formula's. */
  size: number
  bold: boolean
  color: SceneColor
  /** Glyphs that follow one another at their advances. */
  text: string
}

export interface Dash {
  /** Lengths of dashes and gaps, alternating, starting with a dash. */
  array: number[]
  offset: number
}

/** A line drawn as a filled rectangle, rotated about the middle of its left edge. */
export interface Rule {
  type: 'rule'
  x: number
  y: number
  width: number
  height: number
  /** In radians, clockwise. */
  angle: number
  color: SceneColor
  dash: Dash | null
}

export interface BorderSide {
  width: number
  dashed: boolean
  color: SceneColor
}

/** A rectangle whose borders lie inside its edges, as CSS draws a border-box. */
export interface Box {
  type: 'box'
  x: number
  y: number
  width: number
  height: number
  /** Top, right, bottom and left. */
  borders: [BorderSide, BorderSide, BorderSide, BorderSide]
  /** Top-left, top-right, bottom-right and bottom-left. */
  radii: [number, number, number, number]
  fill: SceneColor | null
}

export type SceneItem = GlyphRun | Rule | Box

export interface Scene {
  width: number
  height: number
  /** In drawing order. */
  items: SceneItem[]
}

interface Element {
  tag: string
  classes: string[]
  style: Map<string, string>
  children: Node[]
}

type Node = Element | string

const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>/g
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g, (_, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal))
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name as 'amp'] ?? ''
  })
}

function parseStyle(value: string): Map<string, string> {
  const style = new Map<string, string>()
  for (const declaration of value.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    style.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim())
  }
  return style
}

// Typlet's markup is generated, with escaped text and attributes, so a small
// tokenizer reads it; it also runs where there is no DOM.
function parseMarkup(markup: string): Element {
  const root: Element = { tag: '', classes: [], style: new Map(), children: [] }
  const stack = [root]
  let last = 0
  for (const match of markup.matchAll(TAG)) {
    const parent = stack[stack.length - 1]
    const index = match.index ?? 0
    if (index > last) parent.children.push(decodeEntities(markup.slice(last, index)))
    last = index + match[0].length

    const [, closing, tag, attributes, selfClosing] = match
    if (closing) {
      let open = stack.length - 1
      while (open > 0 && stack[open].tag !== tag) open -= 1
      if (open > 0) stack.length = open
      continue
    }
    const element: Element = { tag, classes: [], style: new Map(), children: [] }
    for (const [, name, value] of attributes.matchAll(ATTRIBUTE)) {
      if (name === 'class') element.classes = decodeEntities(value).split(/\s+/).filter(Boolean)
      else if (name === 'style') element.style = parseStyle(decodeEntities(value))
    }
    parent.children.push(element)
    if (!selfClosing) stack.push(element)
  }
  if (last < markup.length) stack[stack.length - 1].children.push(decodeEntities(markup.slice(last)))
  return root
}

const isElement = (node: Node): node is Element => typeof node !== 'string'
const hasClass = (element: Element, name: string) => element.classes.includes(name)

function findElement(element: Element, predicate: (element: Element) => boolean): Element | null {
  for (const child of element.children) {
    if (!isElement(child)) continue
    if (predicate(child)) return child
    const found = findElement(child, predicate)
    if (found) return found
  }
  return null
}

function textOf(element: Element): string {
  return element.children.map(child => (isElement(child) ? textOf(child) : child)).join('')
}

/** A length in ems, as Typlet writes it: `1.25em`, or `0`. */
function em(value: string | undefined): number {
  if (!value) return 0
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : 0
}

function lengths(value: string | undefined): number[] {
  return value ? value.split(/\s+/).map(em) : []
}

/** A rule's dashes, from the repeating gradient that draws them. */
function parseDash(background: string): { dash: Dash; color: SceneColor } | null {
  if (!background.startsWith('repeating-linear-gradient(')) return null
  const stops = background
    .slice(background.indexOf('(') + 1, background.lastIndexOf(')'))
    .split(',')
    .slice(1)
    .map(stop => {
      const [color, from, to] = stop.trim().split(/\s+/)
      return { color, from: em(from), to: em(to) }
    })
  if (stops.length === 0) return null
  const color = stops.find(stop => stop.color !== 'transparent')?.color ?? 'currentColor'
  return { dash: { array: stops.map(stop => stop.to - stop.from), offset: -stops[0].from }, color }
}

function parseBorders(style: Map<string, string>): Box['borders'] {
  const none: BorderSide = { width: 0, dashed: false, color: 'currentColor' }
  const uniform = style.get('border')
  if (uniform) {
    const [width, line, color] = uniform.split(/\s+/)
    const side = { width: em(width), dashed: line === 'dashed', color: color ?? 'currentColor' }
    return [side, side, side, side]
  }
  const widths = lengths(style.get('border-width'))
  const lines = style.get('border-style')?.split(/\s+/) ?? []
  const colors = style.get('border-color')?.split(/\s+/) ?? []
  const side = (index: number): BorderSide => (
    lines[index] && lines[index] !== 'none'
      ? { width: widths[index] ?? 0, dashed: lines[index] === 'dashed', color: colors[index] ?? 'currentColor' }
      : none
  )
  return [side(0), side(1), side(2), side(3)]
}

/** The glyphs, rules and boxes of a frame whose top-left corner is at (x, y). */
function frameItems(frame: Element, x: number, y: number): SceneItem[] {
  const items: SceneItem[] = []
  for (const child of frame.children) {
    if (!isElement(child)) continue
    const { style } = child
    if (hasClass(child, 'g')) {
      // Positions are in the run's own ems, and its baseline is 1em below its top.
      const size = style.has('font-size') ? em(style.get('font-size')) : 1
      items.push({
        type: 'glyphs',
        x: x + em(style.get('left')) * size,
        y: y + (em(style.get('top')) + 1) * size,
        size,
        bold: hasClass(child, 'b'),
        color: style.get('color') ?? 'currentColor',
        text: textOf(child),
      })
    } else if (hasClass(child, 'r')) {
      const background = style.get('background') ?? 'currentColor'
      const dashed = parseDash(background)
      const rotation = /rotate\((-?[\d.e-]+)rad\)/.exec(style.get('transform') ?? '')
      items.push({
        type: 'rule',
        x: x + em(style.get('left')),
        y: y + em(style.get('top')),
        width: em(style.get('width')),
        height: em(style.get('height')),
        angle: rotation ? Number(rotation[1]) : 0,
        color: dashed?.color ?? background,
        dash: dashed?.dash ?? null,
      })
    } else if (hasClass(child, 'x')) {
      const radii = lengths(style.get('border-radius'))
      items.push({
        type: 'box',
        x: x + em(style.get('left')),
        y: y + em(style.get('top')),
        width: em(style.get('width')),
        height: em(style.get('height')),
        borders: parseBorders(style),
        radii: [radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0],
        fill: style.get('background') ?? null,
      })
    }
    // Links (`.l`) are transparent and draw nothing.
  }
  return items
}

/** Frames side by side on one baseline: a display formula, or an inline formula's pieces. */
function lineScene(frames: Element[]): Scene {
  let x = 0
  let ascent = 0
  let descent = 0
  const placed = frames.map(frame => {
    const width = em(frame.style.get('width'))
    const height = em(frame.style.get('height'))
    // Frames are lowered by their descent: `vertical-align` is its negation.
    const frameDescent = -em(frame.style.get('vertical-align'))
    const piece = { frame, x, width, height, descent: frameDescent }
    x += width + em(frame.style.get('margin-right'))
    ascent = Math.max(ascent, height - frameDescent)
    descent = Math.max(descent, frameDescent)
    return piece
  })
  const items = placed.flatMap(piece => frameItems(piece.frame, piece.x, ascent - (piece.height - piece.descent)))
  const last = placed[placed.length - 1]
  return { width: last ? last.x + last.width : 0, height: ascent + descent, items }
}

/**
 * A numbered display equation: the equation between two sides as wide as the
 * number and its gap, with their frames aligned at the top, as Typlet's row is
 * laid out when it shrinks to fit.
 */
function numberedScene(children: Element[]): Scene {
  let x = 0
  let height = 0
  const items: SceneItem[] = []
  const place = (frame: Element, frameX: number) => {
    const top = em(frame.style.get('margin-top'))
    height = Math.max(height, top + em(frame.style.get('height')))
    items.push(...frameItems(frame, frameX, top))
  }
  for (const child of children) {
    if (hasClass(child, 'f')) {
      place(child, x)
      x += em(child.style.get('width'))
    } else if (hasClass(child, 't')) {
      const frames = child.children.filter(isElement).filter(element => hasClass(element, 'f'))
      const contentWidth = frames.reduce((sum, frame) => sum + em(frame.style.get('width')), 0)
      const width = Math.max(em(child.style.get('min-width')), contentWidth)
      let frameX = child.style.get('justify-content') === 'flex-end' ? x + width - contentWidth : x
      for (const frame of frames) {
        place(frame, frameX)
        frameX += em(frame.style.get('width'))
      }
      x += width
    }
  }
  return { width: x, height, items }
}

/** Reads Typlet's HTML layout (its `output: 'html'`) into a scene. */
export function parseTypletLayout(markup: string): Scene {
  const layout = findElement(parseMarkup(markup), element => hasClass(element, 'typlet-html'))
  if (!layout) throw new Error('The markup has no Typlet layout.')
  const children = layout.children.filter(isElement)
  return children.some(child => hasClass(child, 't'))
    ? numberedScene(children)
    : lineScene(children.filter(child => hasClass(child, 'f')))
}
