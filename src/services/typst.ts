// Typst compilation service using typst.ts
import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

export interface DiagnosticInfo {
  severity: 'error' | 'warning'
  message: string
  hints: string[]
}

export interface CompileResult {
  success: boolean
  svg?: string
  diagnostics?: DiagnosticInfo[]
}

let isInitialized = false

// Initialize typst.ts with WASM modules
async function initializeTypst() {
  if (isInitialized) return

  try {
    // Set compiler initialization options with new API
    $typst.setCompilerInitOptions({
      getModule: () => fetch(compilerWasm).then(r => r.arrayBuffer()),
    })

    // Set renderer initialization options with new API
    $typst.setRendererInitOptions({
      getModule: () => fetch(rendererWasm).then(r => r.arrayBuffer()),
    })

    isInitialized = true
  } catch (error) {
    console.error('Failed to initialize typst.ts:', error)
    throw error
  }
}

interface SourceDiagnostic {
  severity?: string
  message?: string
  hints?: string[]
}

function parseRustDiagnosticString(str: string): DiagnosticInfo | null {
  // Parse Rust debug format: SourceDiagnostic { message: "...", hints: [...] }
  const messageMatch = str.match(/message:\s*"([^"]*(?:\\.[^"]*)*)"/)
  if (!messageMatch) return null

  const message = messageMatch[1].replace(/\\"/g, '"')
  const hints: string[] = []

  // Extract severity
  const severityMatch = str.match(/severity:\s*(\w+)/)
  const severity = severityMatch?.[1]?.toLowerCase() === 'warning' ? 'warning' : 'error'

  // Extract hints array
  const hintsMatch = str.match(/hints:\s*\[([\s\S]*?)\]\s*[}\]]/)
  if (hintsMatch && hintsMatch[1].trim()) {
    const hintsStr = hintsMatch[1]
    // Regex that properly handles escaped quotes inside strings
    const hintRegex = /"((?:[^"\\]|\\.)*)"/g
    let match
    while ((match = hintRegex.exec(hintsStr)) !== null) {
      // Unescape the string: replace \" with " and \` with `
      const hint = match[1]
        .replace(/\\"/g, '"')
        .replace(/\\`/g, '`')
      hints.push(hint)
    }
  }

  return { severity, message, hints }
}

function extractDiagnostics(error: unknown): DiagnosticInfo[] {
  const errorStr = error instanceof Error ? error.message : String(error)

  // Try to parse Rust SourceDiagnostic format
  if (errorStr.includes('SourceDiagnostic')) {
    const parsed = parseRustDiagnosticString(errorStr)
    if (parsed) return [parsed]
  }

  // Handle JavaScript object formats
  if (Array.isArray(error) && error.length > 0) {
    const diagnostics = (error as SourceDiagnostic[])
      .filter(d => d && typeof d === 'object' && d.message)
      .map(d => {
        const severity: 'error' | 'warning' = d.severity?.toLowerCase() === 'warning' ? 'warning' : 'error'
        return {
          severity,
          message: d.message || '',
          hints: d.hints || []
        }
      })
    if (diagnostics.length > 0) return diagnostics
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const obj = error as SourceDiagnostic
    if (obj.message) {
      const severity: 'error' | 'warning' = obj.severity?.toLowerCase() === 'warning' ? 'warning' : 'error'
      return [{
        severity,
        message: obj.message,
        hints: obj.hints || []
      }]
    }
  }

  // Fallback: create a generic error diagnostic
  return [{
    severity: 'error',
    message: errorStr,
    hints: []
  }]
}

export async function compileTypst(code: string): Promise<CompileResult> {
  try {
    // Initialize typst.ts if not already done
    await initializeTypst()

    // Wrap code with page settings for auto-sized output
    const wrappedCode = `#set page(width: auto, height: auto, margin: 0.5em)
#set text(size: 24pt)
${code}`

    // Compile Typst code to SVG
    const svg = await $typst.svg({ mainContent: wrappedCode })

    return {
      success: true,
      svg,
    }
  } catch (error) {
    return {
      success: false,
      diagnostics: extractDiagnostics(error),
    }
  }
}
