import { describe, expect, it } from 'vitest'
import { renderTyplet, renderTypletSymbol, typletHtmlSnippet, typletLayoutHtml, typletMathml } from './typlet'
import { mathPickerGroups, quickInsertSymbols } from '../data/mathPicker'

describe('renderTyplet', () => {
  it('renders simplified input as a display formula with HTML and MathML', () => {
    const result = renderTyplet('x^2', true)
    expect(result).toMatchObject({ status: 'rendered', formula: { formula: 'x^2', displayMode: true }, mathmlReason: null })
    if (result.status !== 'rendered') return
    expect(result.html).toContain('class="typlet-display"')
    expect(result.html).toContain('class="typlet-html"')
    expect(result.html).toContain('<math display="block">')
  })

  it('renders a plain Typst document with its preamble', () => {
    const result = renderTyplet('#let half(x) = $#x / 2$\n$ half(a) $', false)
    expect(result).toMatchObject({ status: 'rendered', formula: { formula: 'half(a)', preamble: '#let half(x) = $#x / 2$\n' } })
  })

  it('keeps Typst’s messages and hints, and the kind of error', () => {
    const result = renderTyplet('x + foo', true)
    expect(result).toMatchObject({ status: 'error', kind: 'eval' })
    if (result.status !== 'error') return
    expect(result.diagnostics[0].message).toBe('unknown variable: foo')
    expect(result.diagnostics[0].hints.length).toBeGreaterThan(0)
  })

  it('marks what Typlet refuses as unsupported, so typst.ts can render it', () => {
    expect(renderTyplet('#show math.equation: set text(red)\n$ x $', false)).toMatchObject({ status: 'error', kind: 'unsupported' })
    expect(renderTyplet('Text and $ x $', false)).toEqual({ status: 'unsupportedDocument', issue: 'content' })
    expect(renderTyplet('  ', true)).toEqual({ status: 'empty' })
  })

  it('reports formulas Typlet draws as MathML', () => {
    const result = renderTyplet('"文字"', true)
    expect(result).toMatchObject({ status: 'rendered' })
    if (result.status !== 'rendered') return
    expect(result.mathmlReason).toContain('New Computer Modern Math has no glyph')
    expect(() => typletLayoutHtml(result.formula)).toThrow()
  })
})

describe('Typlet exports', () => {
  const formula = { formula: 'a/b', displayMode: true }

  it('copies the MathML element alone', () => {
    const mathml = typletMathml(formula)
    expect(mathml.startsWith('<math display="block">')).toBe(true)
    expect(mathml.endsWith('</math>')).toBe(true)
  })

  it('copies HTML with the stylesheet it needs', () => {
    const html = typletHtmlSnippet(formula)
    expect(html).toMatch(/^<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/typlet@[\d.]+\/fonts\/typlet\.css">\n<span class="typlet-display">/)
  })
})

describe('picker entries', () => {
  it('all render with Typlet', () => {
    const codes = [
      ...mathPickerGroups.flatMap(group => group.categories.flatMap(category => category.symbols.map(symbol => symbol.code))),
      ...quickInsertSymbols.map(symbol => symbol.code),
    ]
    expect(codes.filter(code => renderTypletSymbol(code) === null)).toEqual([])
  })
})
