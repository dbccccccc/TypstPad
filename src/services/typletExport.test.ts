import { describe, expect, it } from 'vitest'
import { typletLayoutHtml } from './typlet'
import { EXPORT_EM_PX, EXPORT_MARGIN_PX, parseUnicodeRange, placeGlyphs, sceneToSvg, type GlyphMetrics } from './typletExport'
import { parseTypletLayout, type Scene } from './typletScene'

// Every glyph half an em wide.
const metrics: GlyphMetrics = { advance: () => 0.5 }

function scene(formula: string): Scene {
  return parseTypletLayout(typletLayoutHtml({ formula, displayMode: true }))
}

function svgSize(svg: string): [number, number] {
  const match = /<svg [^>]*width="([\d.]+)" height="([\d.]+)"/.exec(svg)
  return [Number(match?.[1]), Number(match?.[2])]
}

describe('placeGlyphs', () => {
  it('places each glyph of a run at the advances before it, in the run’s size', () => {
    const run = { type: 'glyphs' as const, x: 1, y: 2, size: 0.5, bold: false, color: 'currentColor', text: '(𝑥)' }
    expect(placeGlyphs(run, metrics)).toEqual([
      { char: '(', x: 1 },
      { char: '𝑥', x: 1.25 },
      { char: ')', x: 1.5 },
    ])
  })
})

describe('sceneToSvg', () => {
  it('sizes the image like a typst.ts page: 24pt text, a pixel per point and a half-em margin', () => {
    const sum = scene('sum_(i=1)^n i = (n (n + 1)) / 2')
    const [width, height] = svgSize(sceneToSvg(sum, metrics, ''))
    expect(width).toBeCloseTo(sum.width * EXPORT_EM_PX + 2 * EXPORT_MARGIN_PX, 2)
    expect(height).toBeCloseTo(sum.height * EXPORT_EM_PX + 2 * EXPORT_MARGIN_PX, 2)
    // typst.ts rounds the same page up to whole points: 197 × 86.
    expect([Math.ceil(width), Math.ceil(height)]).toEqual([197, 86])
  })

  it('keeps lengths in points relative to the 24pt text, as typst.ts does', () => {
    expect(sceneToSvg(scene('#box(stroke: 1pt, inset: 2pt)[$x$]'), metrics, '')).toContain('stroke-width="1"')
  })

  it('draws glyphs as text in Typlet’s font and rules as rectangles', () => {
    const svg = sceneToSvg(scene('a/b'), metrics, '@font-face{}')
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    expect(svg).toContain('<style>@font-face{}text{font-family:"Typlet NewCM Math";white-space:pre}</style>')
    expect(svg.match(/<text /g)).toHaveLength(2)
    expect(svg).toContain('font-size="24"')
    expect(svg).toContain('>𝑎</text>')
    expect(svg.match(/<rect /g)).toHaveLength(1)
  })

  it('rotates rules about the middle of their left edge', () => {
    expect(sceneToSvg(scene('cancel(x)'), metrics, '')).toMatch(/<rect [^>]*transform="rotate\(-38\.378 [\d.]+ [\d.]+\)"\/>/)
  })

  it('draws colors with alpha as an opacity', () => {
    expect(sceneToSvg(scene('#highlight[x]'), metrics, '')).toContain('fill="#fffd11" fill-opacity="0.631"')
  })

  it('escapes text', () => {
    expect(sceneToSvg(scene('a < b'), metrics, '')).toContain('>&lt;</text>')
  })
})

describe('parseUnicodeRange', () => {
  it('reads single code points, ranges and wildcards', () => {
    expect(parseUnicodeRange('U+20-7E, U+A0, u+1d4??')).toEqual([[0x20, 0x7e], [0xa0, 0xa0], [0x1d400, 0x1d4ff]])
  })
})
