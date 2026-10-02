// SHA-256 (FIPS 180-4). crypto.subtle only exists in secure contexts, so
// self-hosted installs served over plain HTTP hash with this implementation.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const INITIAL_STATE = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits))
}

function compressBlock(state: Uint32Array, w: Uint32Array, block: DataView, offset: number): void {
  for (let i = 0; i < 16; i += 1) w[i] = block.getUint32(offset + i * 4)
  for (let i = 16; i < 64; i += 1) {
    const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
    const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
    w[i] = w[i - 16] + s0 + w[i - 7] + s1
  }

  let [a, b, c, d, e, f, g, h] = state
  for (let i = 0; i < 64; i += 1) {
    const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0
    const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0
    h = g
    g = f
    f = e
    e = (d + t1) | 0
    d = c
    c = b
    b = a
    a = (t1 + t2) | 0
  }

  state[0] += a
  state[1] += b
  state[2] += c
  state[3] += d
  state[4] += e
  state[5] += f
  state[6] += g
  state[7] += h
}

/** Hash bytes with a JavaScript implementation that works without crypto.subtle. */
export function sha256HexSync(bytes: Uint8Array): string {
  const state = new Uint32Array(INITIAL_STATE)
  const w = new Uint32Array(64)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fullLength = bytes.byteLength - (bytes.byteLength % 64)
  for (let offset = 0; offset < fullLength; offset += 64) compressBlock(state, w, view, offset)

  // Pad the remainder: a 1 bit, zeros, then the message length in bits.
  const remaining = bytes.byteLength - fullLength
  const tail = new Uint8Array(remaining < 56 ? 64 : 128)
  tail.set(bytes.subarray(fullLength))
  tail[remaining] = 0x80
  const tailView = new DataView(tail.buffer)
  const bitLength = bytes.byteLength * 8
  tailView.setUint32(tail.length - 8, Math.floor(bitLength / 2 ** 32))
  tailView.setUint32(tail.length - 4, bitLength >>> 0)
  for (let offset = 0; offset < tail.length; offset += 64) compressBlock(state, w, tailView, offset)

  return Array.from(state, word => word.toString(16).padStart(8, '0')).join('')
}

/** Hash bytes with Web Crypto when available, falling back to sha256HexSync. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) return sha256HexSync(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
