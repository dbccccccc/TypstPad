import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function streamedResponse(byteLength: number, headers: Record<string, string> = {}) {
  const bytes = new Uint8Array(byteLength)
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 4))
      controller.enqueue(bytes.slice(4))
      controller.close()
    },
  }), { headers })
}

async function loadModule() {
  // getCompilerModule caches its result for the lifetime of the module.
  return import('./typstWasm')
}

describe('Typst WebAssembly loading', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(WebAssembly, 'compileStreaming').mockResolvedValue({} as WebAssembly.Module)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reports progress against Content-Length for uncompressed responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamedResponse(10, { 'content-length': '10' })))
    const { getCompilerModule } = await loadModule()
    const progress: Array<[number, number | undefined]> = []

    await getCompilerModule((loaded, total) => progress.push([loaded, total]))

    expect(progress).toEqual([[4, 10], [10, 10]])
  })

  it('omits the total when Content-Length counts compressed bytes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamedResponse(10, { 'content-length': '6', 'content-encoding': 'br' })))
    const { getCompilerModule } = await loadModule()
    const progress: Array<[number, number | undefined]> = []

    await getCompilerModule((loaded, total) => progress.push([loaded, total]))

    expect(progress).toEqual([[4, undefined], [10, undefined]])
  })

  it('compiles each module once and retries after a failed download', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
      .mockImplementation(async () => streamedResponse(10))
    vi.stubGlobal('fetch', fetchMock)
    const { getCompilerModule } = await loadModule()

    await expect(getCompilerModule()).rejects.toThrow('Failed to fetch Typst compiler (503 Service Unavailable)')
    const compiled = await getCompilerModule()

    expect(await getCompilerModule()).toBe(compiled)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(WebAssembly.compileStreaming).toHaveBeenCalledTimes(1)
  })
})
