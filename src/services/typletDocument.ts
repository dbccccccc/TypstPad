// Typlet renders formulas, not documents. In plain Typst mode, a document it can
// render is a preamble of statements, such as `#let` and `#set`, followed by a
// single equation: Typlet evaluates the preamble before the formula, as Typst does
// at the start of a document. Anything else needs the typst.ts compiler.
import { parse, SyntaxKind, type SyntaxDiagnostic, type SyntaxNode } from 'typlet'

export interface TypletFormula {
  /** The equation's math, without its `$` delimiters. */
  formula: string
  /** Whether the equation is a display (block) equation. */
  displayMode: boolean
  /** The statements before the equation, if any. */
  preamble?: string
}

/** Why a document is not a single formula. */
export type DocumentIssue = 'content' | 'multipleEquations'

export type TypletSource =
  | { kind: 'empty' }
  | { kind: 'formula'; formula: TypletFormula }
  | { kind: 'syntaxError'; diagnostics: SyntaxDiagnostic[] }
  | { kind: 'unsupportedDocument'; issue: DocumentIssue; start: number; end: number }

// Statements Typlet evaluates in a preamble. It refuses some of them, such as
// show rules and imports, with an error that names the feature.
const STATEMENTS = new Set([
  SyntaxKind.LetBinding,
  SyntaxKind.SetRule,
  SyntaxKind.ShowRule,
  SyntaxKind.ModuleImport,
  SyntaxKind.ModuleInclude,
])

const TRIVIA = new Set([
  SyntaxKind.Space,
  SyntaxKind.Parbreak,
  SyntaxKind.LineComment,
  SyntaxKind.BlockComment,
])

/** Simplified Formula Mode input as Typlet's formula, as the compiler wraps it in `toFullTypst`. */
export function simplifiedFormulaSource(input: string): TypletSource {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'empty' }
  // `$` is literal text in simplified mode, so it is escaped inside the equation.
  return { kind: 'formula', formula: { formula: trimmed.replace(/\$/g, '\\$'), displayMode: true } }
}

// Typst's rule: an equation is a block when its math is surrounded by whitespace.
function isBlockEquation(equation: SyntaxNode): boolean {
  const { children } = equation
  return children.length >= 3
    && children[1].kind === SyntaxKind.Space
    && children[children.length - 2].kind === SyntaxKind.Space
}

/** Splits a plain Typst document into a preamble and the equation that follows it. */
export function typstDocumentSource(source: string): TypletSource {
  const root = parse(source, { mode: 'markup' })
  if (root.erroneous()) {
    // Typst reports syntax errors before it evaluates anything.
    return { kind: 'syntaxError', diagnostics: root.diagnostics().filter(d => d.severity === 'error') }
  }

  let offset = 0
  let equation: { node: SyntaxNode; start: number } | null = null
  let afterStatement = false
  const children = root.children
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]
    const start = offset
    offset += child.len
    if (TRIVIA.has(child.kind)) continue
    if (child.kind === SyntaxKind.Semicolon && afterStatement) continue
    afterStatement = false

    if (!equation && child.kind === SyntaxKind.Hash) {
      const statement = children[index + 1]
      if (statement && STATEMENTS.has(statement.kind)) {
        index += 1
        offset += statement.len
        afterStatement = true
        continue
      }
    }
    if (child.kind === SyntaxKind.Equation) {
      if (equation) return { kind: 'unsupportedDocument', issue: 'multipleEquations', start, end: offset }
      equation = { node: child, start }
      continue
    }
    // Text, markup and code with content of its own.
    return { kind: 'unsupportedDocument', issue: 'content', start, end: offset }
  }

  if (!equation) return { kind: 'empty' }
  const math = equation.node.children.find(child => child.kind === SyntaxKind.Math)
  const formula = math?.fullText() ?? ''
  if (!formula.trim()) return { kind: 'empty' }

  const preamble = source.slice(0, equation.start)
  return {
    kind: 'formula',
    formula: {
      formula,
      displayMode: isBlockEquation(equation.node),
      ...(preamble.trim() ? { preamble } : {}),
    },
  }
}

/** The formula that Typlet renders for the editor's content. */
export function typletSource(code: string, simplifiedFormulaMode: boolean): TypletSource {
  return simplifiedFormulaMode ? simplifiedFormulaSource(code) : typstDocumentSource(code)
}
