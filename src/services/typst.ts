// Typst compilation service using typst.ts
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet'
import { loadFonts } from '@myriaddreamin/typst.ts/options.init'
import { toFullTypst } from '../utils/formulaMode'
import { getFontSources } from './fonts'
import { extractDiagnostics, type DiagnosticInfo } from './typstDiagnostics'
import { getCompilerModule, getRendererModule } from './typstWasm'

export type { DiagnosticInfo }

let typstInstance: TypstSnippet | null = null

// Font loading progress tracking
let fontsLoaded = 0
let fontsTotal = 0

// Store font callback in an object to avoid TypeScript narrowing issues
const fontProgress = {
  callback: null as ((loaded: number, total: number) => void) | null
}

// Custom fetcher that tracks font loading progress
const fontFetcher: typeof fetch = async (input, init) => {
  const response = await fetch(input, init)
  fontsLoaded++
  const cb = fontProgress.callback
  if (cb) cb(fontsLoaded, fontsTotal)
  return response
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
let initVersion = 0

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

  const promise = initializeTypst()
  initPromise = promise

  return promise.catch((error) => {
    // Allow retries after transient network/WASM initialization failures.
    if (initPromise === promise) {
      initPromise = null
      isInitialized = false
      typstInstance = null
      fontProgress.callback = null
    }
    throw error
  })
}

function notifyLoadingProgress(
  progress: { phase: LoadingPhase; loaded?: number; total?: number },
  version = initVersion
) {
  if (version !== initVersion) return
  for (const subscriber of loadingSubscribers) {
    subscriber(progress)
  }
}

async function createTypstInstance(version: number) {
  const { urls, data } = await getFontSources()
  fontsTotal = urls.length + data.length
  fontsLoaded = data.length

  const instance = new TypstSnippet()
  instance.use({
    key: 'managed-fonts',
    forRoles: ['compiler'],
    provides: [loadFonts([...urls, ...data], { assets: false, fetcher: fontFetcher })],
  })
  instance.use(TypstSnippet.fetchPackageRegistry())
  instance.setCompilerInitOptions({
    getModule: () => getCompilerModule((loaded, total) => {
      notifyLoadingProgress({ phase: 'loadingCompiler', loaded, total }, version)
    }),
  })
  instance.setRendererInitOptions({
    getModule: () => getRendererModule((loaded, total) => {
      notifyLoadingProgress({ phase: 'loadingRenderer', loaded, total }, version)
    }),
  })
  return instance
}

async function getTypstInstance(version = initVersion) {
  if (!typstInstance) {
    const instance = await createTypstInstance(version)
    // Fonts may have changed while the font list was loading; don't keep a stale instance.
    if (version !== initVersion) return instance
    typstInstance ??= instance
  }
  return typstInstance
}

export function refreshTypstFonts(): void {
  initVersion += 1
  typstInstance = null
  isInitialized = false
  initPromise = null
  fontsLoaded = 0
  fontsTotal = 0
  fontProgress.callback = null
  symbolCache.clear()
}

// Initialize typst.ts with WASM modules
async function initializeTypst() {
  if (isInitialized) return

  try {
    const version = initVersion
    notifyLoadingProgress({ phase: 'loadingCompiler' }, version)

    const typst = await getTypstInstance(version)

    // Set up font loading progress callback
    fontProgress.callback = (loaded, total) => {
      if (version !== initVersion) return
      notifyLoadingProgress({ phase: 'loadingFonts', loaded, total }, version)
    }

    // Trigger actual WASM loading by doing a simple compile
    notifyLoadingProgress({ phase: 'initializing' }, version)
    await typst.svg({ mainContent: '#set page(width: auto, height: auto)\n$ x $' })
    if (version !== initVersion) return

    // Clear font callback
    fontProgress.callback = null

    isInitialized = true
    notifyLoadingProgress({ phase: 'ready' }, version)
  } catch (error) {
    console.error('Failed to initialize typst.ts:', error)
    throw error
  }
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
    const typst = await getTypstInstance()

    // Simplified formula mode wraps the whole input in one display equation
    const processedCode = options?.simplifiedFormulaMode ? toFullTypst(code) : code

    // Wrap code with page settings for auto-sized output
    const wrappedCode = `#set page(width: auto, height: auto, margin: 0.5em)
#set text(size: 24pt)
${processedCode}`

    // Compile Typst code to SVG
    const svg = await typst.svg({ mainContent: wrappedCode })

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
    const typst = await getTypstInstance()
    const wrappedCode = `#set page(width: auto, height: auto, margin: 0pt)
#set text(size: 18pt)
$ ${code} $`
    const svg = await typst.svg({ mainContent: wrappedCode })
    symbolCache.set(code, svg)
    return svg
  } catch {
    return null
  }
}
