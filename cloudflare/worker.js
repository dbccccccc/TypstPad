// Workers static assets reject files over 25 MiB, so scripts/prepare-cloudflare.mjs
// stores larger files, such as the 28 MB Typst compiler, as numbered parts with a
// <file>.parts.json list of their sizes. wrangler.jsonc runs this Worker only for
// those URLs; every other request is served from static assets without invoking it.
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request)

    // Request the pieces without the visitor's headers, so they arrive
    // uncompressed; Cloudflare compresses the joined response.
    const asset = (suffix) => {
      const url = new URL(request.url)
      url.pathname += suffix
      url.search = ''
      return env.ASSETS.fetch(url)
    }
    const list = await asset('.parts.json')
    if (!list.ok) {
      // Not split in this build, or not a file at all.
      await list.body?.cancel()
      return env.ASSETS.fetch(request)
    }
    const { sizes } = await list.json()
    const parts = await Promise.all(sizes.map((_, index) => asset(`.part${index}`)))
    const failed = parts.find((part) => !part.ok)
    if (failed) {
      await Promise.all(parts.map((part) => part !== failed && part.body?.cancel()))
      return failed
    }

    // Keep the headers _headers adds to the parts, which _headers would not
    // add to this Worker's response.
    const headers = new Headers(parts[0].headers)
    headers.delete('ETag')
    headers.set('Content-Type', 'application/wasm')
    // Vite fingerprints the file name, so its content never changes.
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    const total = sizes.reduce((sum, size) => sum + size, 0)
    if (request.method === 'HEAD') {
      await Promise.all(parts.map((part) => part.body?.cancel()))
      headers.set('Content-Length', String(total))
      return new Response(null, { headers })
    }
    headers.delete('Content-Length')

    // A known length lets browsers show download progress for the compiler.
    const { readable, writable } = new FixedLengthStream(total)
    ctx.waitUntil((async () => {
      for (const part of parts) await part.body.pipeTo(writable, { preventClose: true })
      await writable.close()
    })())
    return new Response(readable, { headers })
  },
}
