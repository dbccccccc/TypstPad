import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'

// Writes .br and .gz files next to compressible build output. Nginx serves them
// with brotli_static and gzip_static instead of compressing large assets, such
// as the 28 MB Typst compiler, on every request.
const { values } = parseArgs({ options: { quality: { type: 'string', default: '11' } } })
const quality = Number(values.quality)
if (!Number.isInteger(quality) || quality < 0 || quality > 11) {
  throw new Error('--quality must be a Brotli quality from 0 to 11.')
}

const outDir = path.resolve('dist')
const COMPRESSIBLE = /\.(css|html|js|json|md|mjs|svg|txt|wasm|xml)$/
// Matches gzip_min_length in nginx.conf.
const MIN_BYTES = 1024
const brotliAsync = promisify(brotliCompress)
const gzipAsync = promisify(gzip)

const files = (await readdir(outDir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && COMPRESSIBLE.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name))

let originalBytes = 0
let brotliBytes = 0
let written = 0
await Promise.all(files.map(async (file) => {
  const data = await readFile(file)
  if (data.length < MIN_BYTES) return
  const [br, gz] = await Promise.all([
    brotliAsync(data, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: quality,
        [constants.BROTLI_PARAM_SIZE_HINT]: data.length,
      },
    }),
    gzipAsync(data, { level: 9 }),
  ])
  originalBytes += data.length
  brotliBytes += Math.min(br.length, data.length)
  // Nginx would serve a precompressed file even when it is larger.
  for (const [suffix, compressed] of [['.br', br], ['.gz', gz]]) {
    if (compressed.length >= data.length) continue
    await writeFile(file + suffix, compressed)
    written += 1
  }
}))

const megabytes = (bytes) => (bytes / 1e6).toFixed(1)
console.log(`Wrote ${written} precompressed files (Brotli quality ${quality}): ${megabytes(originalBytes)} MB -> ${megabytes(brotliBytes)} MB with Brotli.`)
