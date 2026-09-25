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

  it('bundles a matching V1.1 model pair and preprocessing contract', () => {
    const root = resolve(process.cwd(), 'public', 'im2typst')
    const json = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'))
    const manifest = json('asset-manifest.json')
    const release = json('model/release-manifest.json')
    const config = json('model/config.json')
    const preprocess = json('model/preprocessor_config.json')
    const generation = json('model/generation_config.json')

    expect(release.version).toBe('v1.1')
    expect(manifest.model_name).toBe(release.model_name)
    expect(manifest.source.source_model_sha256).toBe(release.source_model_sha256)
    for (const graph of ['encoder', 'decoder']) {
      expect(manifest.model[`${graph}.int8.onnx`]).toEqual(release.artifacts[`onnx/int8/${graph}.onnx`])
    }
    expect(release.input.shape).toEqual([1, config.encoder.num_channels, 384, 384])
    expect(config.encoder.num_channels).toBe(1)
    expect(preprocess.requires_custom_preprocessing).toBe(true)
    expect(preprocess.typlens_preprocessing).toEqual(release.preprocessing)
    expect(generation.max_new_tokens).toBe(release.generation.max_new_tokens)
    expect(generation.forced_eos_token_id).toBeNull()

    const sums = readFileSync(resolve(root, 'model/SHA256SUMS'), 'utf8').trim().split(/\r?\n/)
    expect(sums.length).toBe(Object.keys(manifest.model).length - 1)
    for (const line of sums) expect(manifest.model[line.slice(66)].sha256).toBe(line.slice(0, 64))
  })
})
