export interface DiagnosticInfo {
  severity: 'error' | 'warning'
  message: string
  hints: string[]
}

interface SourceDiagnostic {
  severity?: string
  message?: string
  hints?: string[]
}

// typst.ts reports a failed compilation as the Rust debug output of all its diagnostics:
// [SourceDiagnostic { severity: Error, span: Span(..), message: "..", trace: [..], hints: [".."] }, ..]
const RUST_DIAGNOSTIC = 'SourceDiagnostic {'

function toSeverity(value: string | undefined): DiagnosticInfo['severity'] {
  return value?.toLowerCase() === 'warning' ? 'warning' : 'error'
}

// Returns the index just past the string literal that starts at `start`.
function skipStringLiteral(text: string, start: number): number {
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === '"') return index + 1
  }
  return text.length
}

function decodeStringLiteral(literal: string): string | null {
  if (literal.length < 2 || !literal.startsWith('"') || !literal.endsWith('"')) return null
  return literal
    .slice(1, -1)
    .replace(/\\(?:u\{([0-9a-fA-F]{1,6})\}|([\s\S]))/g, (_, hex: string | undefined, char: string | undefined) => {
      if (hex !== undefined) {
        const codePoint = Number.parseInt(hex, 16)
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ''
      }
      switch (char) {
        case 'n': return '\n'
        case 'r': return '\r'
        case 't': return '\t'
        case '0': return '\0'
        default: return char ?? ''
      }
    })
}

// Splits the fields of a debug struct whose body starts at `start`, just after `{`.
function readStructFields(text: string, start: number): { fields: Map<string, string>; end: number } {
  const fields = new Map<string, string>()
  let depth = 0
  let fieldStart = start

  const addField = (end: number) => {
    const field = text.slice(fieldStart, end)
    const separator = field.indexOf(':')
    if (separator !== -1) fields.set(field.slice(0, separator).trim(), field.slice(separator + 1).trim())
  }

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      index = skipStringLiteral(text, index) - 1
    } else if (char === '{' || char === '[' || char === '(') {
      depth += 1
    } else if (char === '}' || char === ']' || char === ')') {
      if (depth === 0) {
        addField(index)
        return { fields, end: index + 1 }
      }
      depth -= 1
    } else if (char === ',' && depth === 0) {
      addField(index)
      fieldStart = index + 1
    }
  }

  addField(text.length)
  return { fields, end: text.length }
}

function readStringList(value: string): string[] {
  const strings: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '"') continue
    const end = skipStringLiteral(value, index)
    const decoded = decodeStringLiteral(value.slice(index, end))
    if (decoded !== null) strings.push(decoded)
    index = end - 1
  }
  return strings
}

function parseRustDiagnostics(text: string): DiagnosticInfo[] {
  const diagnostics: DiagnosticInfo[] = []
  let start = text.indexOf(RUST_DIAGNOSTIC)
  while (start !== -1) {
    const { fields, end } = readStructFields(text, start + RUST_DIAGNOSTIC.length)
    const message = decodeStringLiteral(fields.get('message') ?? '')
    if (message !== null) {
      diagnostics.push({
        severity: toSeverity(fields.get('severity')),
        message,
        hints: readStringList(fields.get('hints') ?? ''),
      })
    }
    start = text.indexOf(RUST_DIAGNOSTIC, end)
  }
  return diagnostics
}

export function extractDiagnostics(error: unknown): DiagnosticInfo[] {
  const errorStr = error instanceof Error ? error.message : String(error)

  if (errorStr.includes(RUST_DIAGNOSTIC)) {
    const parsed = parseRustDiagnostics(errorStr)
    if (parsed.length > 0) return parsed
  }

  // Handle JavaScript object formats
  if (Array.isArray(error) && error.length > 0) {
    const diagnostics = (error as SourceDiagnostic[])
      .filter(d => d && typeof d === 'object' && d.message)
      .map(d => ({
        severity: toSeverity(d.severity),
        message: d.message || '',
        hints: d.hints || [],
      }))
    if (diagnostics.length > 0) return diagnostics
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const obj = error as SourceDiagnostic
    if (obj.message) {
      return [{
        severity: toSeverity(obj.severity),
        message: obj.message,
        hints: obj.hints || [],
      }]
    }
  }

  // Fallback: create a generic error diagnostic
  return [{
    severity: 'error',
    message: errorStr,
    hints: [],
  }]
}
