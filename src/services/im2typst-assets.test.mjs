import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('bundled image recognizer assets', () => {
  it('matches every model and ONNX Runtime artifact in the release manifest', () => {
    const root = resolve(process.cwd(), 'public', 'im2typst')
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'asset-manifest.json'), 'utf8')
    )

    for (const [section, directory] of [
      [manifest.model, 'model'],
      [manifest.runtime, 'ort'],
    ]) {
      for (const [name, expected] of Object.entries(section)) {
        const bytes = readFileSync(resolve(root, directory, name))
        expect(bytes.byteLength, `${directory}/${name} byte length`).toBe(expected.bytes)
        expect(
          createHash('sha256').update(bytes).digest('hex'),
          `${directory}/${name} SHA-256`
        ).toBe(expected.sha256)
      }
    }
  })
})
