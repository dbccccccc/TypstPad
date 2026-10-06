import { describe, expect, it } from 'vitest'
import { renderToString, type RenderOptions } from 'typlet'
import { parseTypletLayout, type Box, type GlyphRun, type Rule } from './typletScene'

function scene(source: string, options: RenderOptions = {}) {
  return parseTypletLayout(renderToString(source, { displayMode: true, output: 'html', strict: 'ignore', ...options }))
}

const runs = (items: ReturnType<typeof scene>['items']) => items.filter((item): item is GlyphRun => item.type === 'glyphs')

describe('parseTypletLayout', () => {
  it('reads a display formula’s frame and its glyphs on their baselines', () => {
    const { width, height, items } = scene('x^2')
    expect(width).toBeCloseTo(1.0263)
    expect(height).toBeCloseTo(0.8388)
    const [base, exponent] = runs(items)
    // Baselines are 1em below each run's top, in the run's own font size.
    expect(base).toMatchObject({ x: 0, size: 1, bold: false, color: 'currentColor', text: '𝑥' })
    expect(base.y).toBeCloseTo(0.8278)
    expect(exponent.size).toBeCloseTo(0.7)
    expect(exponent.x).toBeCloseTo(0.8171 * 0.7)
    expect(exponent.y).toBeCloseTo((-0.336 + 1) * 0.7)
  })

  it('reads rules, rotated or not', () => {
    const fraction = scene('a/b').items.find((item): item is Rule => item.type === 'rule')
    expect(fraction).toMatchObject({ angle: 0, color: 'currentColor', dash: null })
    const cancel = scene('cancel(x)').items.find((item): item is Rule => item.type === 'rule')
    expect(cancel?.angle).toBeCloseTo(-0.669818)
  })

  it('reads boxes with borders, radii and fills', () => {
    const box = scene('#box(stroke: 1pt + red, inset: 2pt, radius: 3pt, fill: yellow)[$x$]').items
      .find((item): item is Box => item.type === 'box')
    expect(box).toMatchObject({ fill: '#ffdc00' })
    expect(box?.borders.map(side => side.color)).toEqual(['#ff4136', '#ff4136', '#ff4136', '#ff4136'])
    expect(box?.radii[0]).toBeCloseTo(0.2727)

    const underline = scene('#box(stroke: (bottom: 1pt), inset: 2pt)[$y$]').items
      .find((item): item is Box => item.type === 'box')
    expect(underline?.borders.map(side => side.width > 0)).toEqual([false, false, true, false])
    expect(underline?.fill).toBeNull()
  })

  it('keeps colors and bold text', () => {
    const [blue] = runs(scene('#text(fill: blue)[x] + #strong[y]').items)
    expect(blue.color).toBe('#0074d9')
    expect(runs(scene('#strong[y]').items)[0].bold).toBe(true)
  })

  it('places an inline formula’s pieces on one line, with the space between them', () => {
    const { width, items } = scene('a + b + c', { displayMode: false })
    const letters = runs(items).filter(run => /[𝑎𝑏𝑐]/u.test(run.text))
    expect(letters).toHaveLength(3)
    expect(letters[1].x).toBeGreaterThan(letters[0].x)
    expect(width).toBeGreaterThan(letters[2].x)
  })

  it('lays out a numbered equation with its number at the end', () => {
    const { width, items } = scene('a + b', { preamble: '#set math.equation(numbering: "(1)")' })
    const number = runs(items).find(run => run.text === '(1)')
    expect(number).toBeDefined()
    // The equation sits between two sides as wide as the number and its gap.
    expect(width).toBeCloseTo(1.778 + 2.1944 + 1.778)
    expect(number!.x).toBeCloseTo(width - 1.278)
  })

  it('decodes escaped text', () => {
    expect(runs(scene('a < b').items).map(run => run.text).join('')).toContain('<')
  })
})
