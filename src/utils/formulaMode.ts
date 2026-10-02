// Simplified Formula Mode treats the whole input as one display equation. These
// helpers convert between that input and plain Typst only when both compile to
// the same document, so shared and saved formulas render the same in either mode.

export interface FormulaInMode {
  code: string
  simplifiedFormulaMode: boolean
}

/** Wraps simplified-mode input exactly as the compiler does. */
export function toFullTypst(formula: string): string {
  const trimmed = formula.trim()
  if (!trimmed) return ''
  // `$` is literal text in simplified mode, so it is escaped inside the equation.
  return `$ ${trimmed.replace(/\$/g, '\\$')} $`
}

/**
 * Returns the simplified-mode equivalent of a document that is a single display
 * equation, or null when the document needs plain Typst mode.
 */
export function toSimplifiedFormula(source: string): string | null {
  const trimmed = source.trim()
  if (!trimmed) return ''
  if (trimmed.length < 3 || !trimmed.startsWith('$') || !trimmed.endsWith('$')) return null

  // Display equations have whitespace inside both delimiters.
  const body = trimmed.slice(1, -1)
  if (!/^\s/.test(body) || !/\s$/.test(body)) return null

  const equation = body.trim()
  // In simplified mode the closing delimiter follows on the same line, where a
  // trailing line comment would swallow it.
  if (equation.slice(equation.lastIndexOf('\n') + 1).includes('//')) return null

  const formula = equation.replace(/\\\$/g, '$')
  // Any other `$` ends the equation early, so the document has more than one part.
  return toFullTypst(formula) === `$ ${equation} $` ? formula : null
}

/**
 * Prepares source written in one formula mode for an editor in `targetMode`.
 * Converts it when that is exact; otherwise keeps the source and reports the
 * mode it needs. Source with an unknown mode is left unchanged.
 */
export function adaptFormulaToMode(
  code: string,
  sourceMode: boolean | undefined,
  targetMode: boolean
): FormulaInMode {
  if (sourceMode === undefined || sourceMode === targetMode) {
    return { code, simplifiedFormulaMode: targetMode }
  }

  const converted = targetMode ? toSimplifiedFormula(code) : toFullTypst(code)
  return converted === null
    ? { code, simplifiedFormulaMode: sourceMode }
    : { code: converted, simplifiedFormulaMode: targetMode }
}
