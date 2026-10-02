import { createHash, randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sha256Hex, sha256HexSync } from './sha256'

function nodeSha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('sha256', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('matches the FIPS 180-4 example', () => {
    expect(sha256HexSync(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })

  it('matches Node across padding boundaries and large inputs', () => {
    for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 1000, 3_000_017]) {
      const bytes = new Uint8Array(randomBytes(length))
      expect(sha256HexSync(bytes), `length ${length}`).toBe(nodeSha256(bytes))
    }
  })

  it('hashes a view into a larger buffer', () => {
    const buffer = new Uint8Array(randomBytes(300))
    const view = buffer.subarray(17, 211)
    expect(sha256HexSync(view)).toBe(nodeSha256(view))
  })

  it('uses Web Crypto when available and the fallback otherwise', async () => {
    const bytes = new Uint8Array(randomBytes(4096))
    await expect(sha256Hex(bytes)).resolves.toBe(nodeSha256(bytes))

    vi.stubGlobal('crypto', {})
    await expect(sha256Hex(bytes)).resolves.toBe(nodeSha256(bytes))
  })
})
