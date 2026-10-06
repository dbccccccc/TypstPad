import { describe, expect, it } from 'vitest'
import { simplifiedFormulaSource, typstDocumentSource } from './typletDocument'

describe('simplifiedFormulaSource', () => {
  it('renders the input as one display formula, as the compiler wraps it', () => {
    expect(simplifiedFormulaSource('  x^2 + y^2  ')).toEqual({
      kind: 'formula',
      formula: { formula: 'x^2 + y^2', displayMode: true },
    })
    expect(simplifiedFormulaSource('cost = $5')).toEqual({
      kind: 'formula',
      formula: { formula: 'cost = \\$5', displayMode: true },
    })
    expect(simplifiedFormulaSource('   ')).toEqual({ kind: 'empty' })
  })
})

describe('typstDocumentSource', () => {
  it('reads a single equation and whether it is a display equation', () => {
    expect(typstDocumentSource('$ x^2 $')).toEqual({
      kind: 'formula',
      formula: { formula: 'x^2', displayMode: true },
    })
    expect(typstDocumentSource('\n$x^2$\n')).toEqual({
      kind: 'formula',
      formula: { formula: 'x^2', displayMode: false },
    })
    expect(typstDocumentSource('$ sum_(i=1)^n i\n$')).toEqual({
      kind: 'formula',
      formula: { formula: 'sum_(i=1)^n i', displayMode: true },
    })
  })

  it('keeps the statements before the equation as its preamble', () => {
    const document = '#let norm(x) = $lr(|| #x ||)$\n#set math.mat(delim: "[");\n// Matrices\n$ norm(mat(1, 2; 3, 4)) $\n'
    expect(typstDocumentSource(document)).toEqual({
      kind: 'formula',
      formula: {
        formula: 'norm(mat(1, 2; 3, 4))',
        displayMode: true,
        preamble: '#let norm(x) = $lr(|| #x ||)$\n#set math.mat(delim: "[");\n// Matrices\n',
      },
    })
  })

  it('passes show rules and imports on to Typlet, which names what it refuses', () => {
    const source = typstDocumentSource('#show math.equation: set text(red)\n$ x $')
    expect(source.kind === 'formula' && source.formula.preamble).toBe('#show math.equation: set text(red)\n')
  })

  it('treats documents without an equation as empty', () => {
    expect(typstDocumentSource('')).toEqual({ kind: 'empty' })
    expect(typstDocumentSource('// nothing yet\n#let a = 1')).toEqual({ kind: 'empty' })
    expect(typstDocumentSource('$ $')).toEqual({ kind: 'empty' })
  })

  it('refuses text and other content, which needs a document', () => {
    expect(typstDocumentSource('Area: $ pi r^2 $')).toMatchObject({ kind: 'unsupportedDocument', issue: 'content', start: 0 })
    expect(typstDocumentSource('$ x $ <eq>')).toMatchObject({ kind: 'unsupportedDocument', issue: 'content' })
    expect(typstDocumentSource('#h(1em) $ x $')).toMatchObject({ kind: 'unsupportedDocument', issue: 'content' })
  })

  it('refuses more than one equation', () => {
    expect(typstDocumentSource('$ a $\n\n$ b $')).toEqual({
      kind: 'unsupportedDocument',
      issue: 'multipleEquations',
      start: 7,
      end: 12,
    })
  })

  it('reports syntax errors as Typst does', () => {
    expect(typstDocumentSource('$ unclosed')).toEqual({
      kind: 'syntaxError',
      diagnostics: [{ severity: 'error', message: 'unclosed delimiter', hints: [], start: 0, end: 1 }],
    })
  })
})
