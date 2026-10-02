import { describe, expect, it } from 'vitest'
import { extractDiagnostics } from './typstDiagnostics'

describe('extractDiagnostics', () => {
  it('returns every diagnostic from the compiler error', () => {
    // Captured from typst.ts 0.7 for `$ #(1 +) + #(2 *) $`.
    const error =
      '[SourceDiagnostic { severity: Error, span: Span(1734620958597321), message: "expected expression", trace: [], hints: [] }, ' +
      'SourceDiagnostic { severity: Error, span: Span(1737636761919213), message: "expected expression", trace: [], hints: [] }]'

    expect(extractDiagnostics(error)).toEqual([
      { severity: 'error', message: 'expected expression', hints: [] },
      { severity: 'error', message: 'expected expression', hints: [] },
    ])
  })

  it('keeps escaped quotes and other escapes in messages and hints', () => {
    const error = String.raw`[SourceDiagnostic { severity: Error, span: Span(1), message: "panicked with: \"oops\"", trace: [], hints: ["use ` + '`' + String.raw`a, b` + '`' + String.raw` [not] \\ this", "line\nbreak \u{e9}"] }]`

    expect(extractDiagnostics(error)).toEqual([
      {
        severity: 'error',
        message: 'panicked with: "oops"',
        hints: ['use `a, b` [not] \\ this', 'line\nbreak é'],
      },
    ])
  })

  it('skips nested trace values that contain quotes and brackets', () => {
    const error = String.raw`[SourceDiagnostic { severity: Warning, span: Span(2), message: "unknown font family: x", trace: [Spanned { v: Call(Some("f\"}])")), span: Span(3) }], hints: ["check the font"] }]`

    expect(extractDiagnostics(new Error(error))).toEqual([
      { severity: 'warning', message: 'unknown font family: x', hints: ['check the font'] },
    ])
  })

  it('handles object diagnostics and unknown errors', () => {
    expect(extractDiagnostics([{ severity: 'Warning', message: 'careful', hints: ['hint'] }])).toEqual([
      { severity: 'warning', message: 'careful', hints: ['hint'] },
    ])
    expect(extractDiagnostics(new Error('Failed to fetch Typst compiler (404 Not Found)'))).toEqual([
      { severity: 'error', message: 'Failed to fetch Typst compiler (404 Not Found)', hints: [] },
    ])
    expect(extractDiagnostics('boom')).toEqual([{ severity: 'error', message: 'boom', hints: [] }])
  })
})
