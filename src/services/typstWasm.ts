import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

/** `total` is omitted when the response size is unknown. */
export type DownloadProgress = (loaded: number, total?: number) => void

// Compiled modules are shared by every compiler instance and the font metadata
// reader, so changing fonts does not compile the 28 MB compiler again.
let compilerModule: Promise<WebAssembly.Module> | null = null
let rendererModule: Promise<WebAssembly.Module> | null = null

// Fetch with progress tracking
async function fetchWithProgress(url: string, label: string, onProgress?: DownloadProgress): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label} (${response.status} ${response.statusText})`)
  }
  if (!onProgress || !response.body) return response

  // For compressed responses Content-Length counts encoded bytes, while the
  // stream yields decoded bytes, so it only gives a total without encoding.
  const encoding = response.headers.get('content-encoding')
  const contentLength = Number(response.headers.get('content-length'))
  const total = (!encoding || encoding === 'identity') && contentLength > 0 ? contentLength : undefined

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress(loaded, total !== undefined && loaded <= total ? total : undefined)
  }

  const blob = new Blob(chunks as BlobPart[])
  return new Response(blob, { headers: response.headers })
}

function compileModule(url: string, label: string, onProgress?: DownloadProgress): Promise<WebAssembly.Module> {
  return fetchWithProgress(url, label, onProgress).then(response => WebAssembly.compileStreaming(response))
}

export function getCompilerModule(onProgress?: DownloadProgress): Promise<WebAssembly.Module> {
  compilerModule ??= compileModule(compilerWasm, 'Typst compiler', onProgress).catch((error) => {
    // Allow retries after transient network failures.
    compilerModule = null
    throw error
  })
  return compilerModule
}

export function getRendererModule(onProgress?: DownloadProgress): Promise<WebAssembly.Module> {
  rendererModule ??= compileModule(rendererWasm, 'Typst renderer', onProgress).catch((error) => {
    rendererModule = null
    throw error
  })
  return rendererModule
}
