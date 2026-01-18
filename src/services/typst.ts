// Typst compilation service using typst.ts
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

// Font loading progress tracking
const TOTAL_FONTS = 17 // Number of text fonts
let fontsLoaded = 0

// Store font callback in an object to avoid TypeScript narrowing issues
const fontProgress = {
  callback: null as ((loaded: number, total: number) => void) | null
}

// Custom fetcher that tracks font loading progress
const fontFetcher: typeof fetch = async (input, init) => {
  const response = await fetch(input, init)
  fontsLoaded++
  const cb = fontProgress.callback
  if (cb) cb(fontsLoaded, TOTAL_FONTS)
  return response
}

// Configure fonts to load from local server instead of jsdelivr CDN
$typst.use(
  TypstSnippet.preloadFontAssets({
    assets: ['text'], // Only load text fonts (includes math fonts)
    assetUrlPrefix: '/fonts/', // Load from local /fonts/ directory
    fetcher: fontFetcher,
  })
)

// Enable package registry for downloading Typst packages from https://packages.typst.org
$typst.use(TypstSnippet.fetchPackageRegistry())

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

export type LoadingPhase =
  | 'loadingCompiler'
  | 'loadingRenderer'
  | 'loadingFonts'
  | 'initializing'
  | 'ready'

let isInitialized = false
let initPromise: Promise<void> | null = null

// Loading state for progress tracking
type LoadingCallback = (progress: { phase: LoadingPhase; loaded?: number; total?: number }) => void
const loadingSubscribers = new Set<LoadingCallback>()

export function subscribeToLoadingProgress(callback: LoadingCallback): () => void {
  loadingSubscribers.add(callback)
  return () => {
    loadingSubscribers.delete(callback)
  }
}

// Preload WASM modules (call this early to start loading)
export function preloadTypst(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = initializeTypst()
  return initPromise
}

function notifyLoadingProgress(progress: { phase: LoadingPhase; loaded?: number; total?: number }) {
  for (const subscriber of loadingSubscribers) {
    subscriber(progress)
  }
}

// Fetch with progress tracking
async function fetchWithProgress(url: string, phaseName: LoadingPhase): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${phaseName} (${response.status} ${response.statusText})`)
  }

  if (!response.body || !response.headers.get('content-length')) {
    // Fallback if streaming not supported
    return response
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    loaded += value.length

    notifyLoadingProgress({
      phase: phaseName,
      loaded,
      total: contentLength
    })
  }

  const blob = new Blob(chunks as BlobPart[])
  return new Response(blob, { headers: response.headers })
}

// Initialize typst.ts with WASM modules
async function initializeTypst() {
  if (isInitialized) return

  try {
    notifyLoadingProgress({ phase: 'loadingCompiler' })

    // Set compiler initialization options with streaming compilation
    $typst.setCompilerInitOptions({
      getModule: () => {
        const response = fetchWithProgress(compilerWasm, 'loadingCompiler')
        return response.then(r => WebAssembly.compileStreaming(r))
      },
    })

    // Set renderer initialization options with streaming compilation
    $typst.setRendererInitOptions({
      getModule: () => {
        const response = fetchWithProgress(rendererWasm, 'loadingRenderer')
        return response.then(r => WebAssembly.compileStreaming(r))
      },
    })

    // Set up font loading progress callback
    fontsLoaded = 0
    fontProgress.callback = (loaded, total) => {
      notifyLoadingProgress({ phase: 'loadingFonts', loaded, total })
    }

    // Trigger actual WASM loading by doing a simple compile
    notifyLoadingProgress({ phase: 'initializing' })
    await $typst.svg({ mainContent: '#set page(width: auto, height: auto)\n$ x $' })

    // Clear font callback
    fontProgress.callback = null

    isInitialized = true
    notifyLoadingProgress({ phase: 'ready' })
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

// Helper function to apply simplified formula mode
function applySimplifiedFormulaMode(code: string): string {
  const trimmed = code.trim()

  // In simplified mode, escape all $ symbols to treat them as literal text
  // This allows users to type $ without it being interpreted as math delimiter
  const escapedCode = trimmed.replace(/\$/g, '\\$')

  // Wrap content in math mode
  return `$ ${escapedCode} $`
}

export async function compileTypst(
  code: string,
  options?: {
    simplifiedFormulaMode?: boolean
  }
): Promise<CompileResult> {
  try {
    // Ensure typst.ts is initialized (uses cached promise if already loading)
    await preloadTypst()

    // Apply simplified formula mode if enabled
    let processedCode = code
    if (options?.simplifiedFormulaMode && code.trim()) {
      processedCode = applySimplifiedFormulaMode(code)
    }

    // Wrap code with page settings for auto-sized output
    const wrappedCode = `#set page(width: auto, height: auto, margin: 0.5em)
#set text(size: 24pt)
${processedCode}`

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

// Symbol SVG cache
const symbolCache = new Map<string, string>()

// Compile a single math symbol to SVG
export async function compileSymbol(code: string): Promise<string | null> {
  // Check cache first
  if (symbolCache.has(code)) {
    return symbolCache.get(code)!
  }

  try {
    await preloadTypst()
    const wrappedCode = `#set page(width: auto, height: auto, margin: 0pt)
#set text(size: 18pt)
$ ${code} $`
    const svg = await $typst.svg({ mainContent: wrappedCode })
    symbolCache.set(code, svg)
    return svg
  } catch {
    return null
  }
}
