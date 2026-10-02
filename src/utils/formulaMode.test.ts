import { describe, expect, it } from 'vitest'
import { adaptFormulaToMode, toFullTypst, toSimplifiedFormula } from './formulaMode'

describe('formula mode conversion', () => {
  it('wraps simplified input exactly as the compiler does', () => {
    expect(toFullTypst('  x^2 + y^2  ')).toBe('$ x^2 + y^2 $')
    expect(toFullTypst('cost = $5')).toBe('$ cost = \\$5 $')
    expect(toFullTypst('   ')).toBe('')
  })

  it('unwraps a single display equation', () => {
    expect(toSimplifiedFormula('$ x^2 $')).toBe('x^2')
    expect(toSimplifiedFormula('$\n  sum_(i=1)^n i\n$')).toBe('sum_(i=1)^n i')
    expect(toSimplifiedFormula('$ cost = \\$5 $')).toBe('cost = $5')
    expect(toSimplifiedFormula('')).toBe('')
  })

  it('round-trips through the simplified-mode wrapper', () => {
    for (const formula of ['x^2', 'cost = $5', 'frac(a, b) // ok\n+ 1', '"$"']) {
      expect(toSimplifiedFormula(toFullTypst(formula))).toBe(formula)
    }
  })

  it('rejects documents that are not one display equation', () => {
    expect(toSimplifiedFormula('Area: $ pi r^2 $')).toBeNull()
    expect(toSimplifiedFormula('$ a $ and $ b $')).toBeNull()
    expect(toSimplifiedFormula('$x$')).toBeNull()
    expect(toSimplifiedFormula('#set text(red)\n$ x $')).toBeNull()
    expect(toSimplifiedFormula('$ $')).toBeNull()
  })

  it('rejects a trailing line comment that would swallow the closing delimiter', () => {
    expect(toSimplifiedFormula('$ x // note\n$')).toBeNull()
  })
})

describe('adaptFormulaToMode', () => {
  it('leaves source unchanged when the mode is unknown or already matches', () => {
    expect(adaptFormulaToMode('x', undefined, false)).toEqual({ code: 'x', simplifiedFormulaMode: false })
    expect(adaptFormulaToMode('$ x $', false, false)).toEqual({ code: '$ x $', simplifiedFormulaMode: false })
  })

  it('converts between modes when the result is equivalent', () => {
    expect(adaptFormulaToMode('x^2', true, false)).toEqual({ code: '$ x^2 $', simplifiedFormulaMode: false })
    expect(adaptFormulaToMode('$ x^2 $', false, true)).toEqual({ code: 'x^2', simplifiedFormulaMode: true })
  })

  it('switches to the source mode when conversion would change the document', () => {
    expect(adaptFormulaToMode('Area: $ pi r^2 $', false, true)).toEqual({
      code: 'Area: $ pi r^2 $',
      simplifiedFormulaMode: false,
    })
  })
})
