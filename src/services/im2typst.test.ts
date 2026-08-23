import { describe, expect, it } from 'vitest'
import { recognitionToEditorCode, validateFormulaImage } from './im2typst'

describe('image-to-Typst editor integration', () => {
  it('uses formula-body output directly in simplified mode', () => {
    expect(recognitionToEditorCode('  frac(a, b)  ', true)).toBe('frac(a, b)')
  })

  it('adds math delimiters in full Typst mode', () => {
    expect(recognitionToEditorCode('x^2 + y^2', false)).toBe('$ x^2 + y^2 $')
  })

  it('accepts supported image formats and rejects unsafe inputs', () => {
    expect(() => validateFormulaImage(new Blob(['image'], { type: 'image/png' }))).not.toThrow()
    expect(() => validateFormulaImage(new Blob([], { type: 'image/png' }))).toThrow(/empty/)
    expect(() => validateFormulaImage(new Blob(['image'], { type: 'image/svg+xml' }))).toThrow(
      /PNG, JPEG, or WebP/
    )
  })
})
