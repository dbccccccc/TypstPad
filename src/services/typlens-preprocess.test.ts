import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { prepareTypLensPixels } from './typlens-preprocess'

type Pixels = Pick<ImageData, 'data' | 'width' | 'height'>

function formula(): Pixels {
  const width = 49, height = 31
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  const dot = (x: number, y: number, value = 0) =>
    data.fill(value, 4 * (y * width + x), 4 * (y * width + x) + 3)
  for (let x = 5; x <= 42; x += 1) dot(x, 15)
  for (let y = 4; y <= 12; y += 1) { dot(10, y); dot(20, y) }
  for (let y = 20; y <= 27; y += 1) dot(15, y)
  dot(43, 2) // Detached accent.
  dot(3, 27) // Decimal point outside the main strokes.
  dot(21, 7, 173) // Antialiasing must survive the content detection mask.
  dot(44, 2, 248) // Faint fringe just outside the detected bounds.
  return { width, height, data }
}

function padded(input: Pixels, left: number, top: number, right: number, bottom: number): Pixels {
  const width = input.width + left + right, height = input.height + top + bottom
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 0; y < input.height; y += 1) {
    data.set(input.data.subarray(y * input.width * 4, (y + 1) * input.width * 4),
      ((y + top) * width + left) * 4)
  }
  return { width, height, data }
}

function digest(image: Pixels): string {
  const pixels = prepareTypLensPixels(image, 384)
  expect(pixels.length).toBe(384 * 384)
  return createHash('sha256').update(new Uint8Array(pixels.buffer)).digest('hex')
}

describe('TypLens V1.1 preprocessing', () => {
  // Float32 tensor hashes independently generated with the upstream browser
  // implementation at 3d19c7d09c60c22913494efa0e803f2967ae14e6.
  it.each([
    ['dots, accents and gray fringes', formula(),
      'df752375b75c01309190240e718974176a3475f0152adc24eff751933b196517'],
    ['color and alpha rounding', {
      width: 7, height: 5,
      data: Uint8ClampedArray.from({ length: 7 * 5 * 4 }, (_, i) => (i * 79 + 13) % 256),
    }, '4d06dffe6515936248dc735ba425815af2d5e44a7d2094af63f4e167a8be2b61'],
    ['bicubic downsampling', {
      width: 513, height: 401,
      data: Uint8ClampedArray.from({ length: 513 * 401 * 4 }, (_, i) =>
        (i * 37 + Math.floor(i / 31)) % 256),
    }, '69e34da4aa460dfb3373232442ca0ace7cfe1844104ac8d63b9cc47b0b203f9b'],
    ['lower perimeter median and corner counting', {
      width: 4, height: 3,
      data: Uint8ClampedArray.from(
        [30, 60, 180, 210, 30, 90, 150, 210, 60, 90, 180, 220].flatMap(v => [v, v, v, 255])
      ),
    }, '5ab112033d0e580a64a943110a56a73e599530f3c63f9c9c169c0c1aa99dc498'],
    ['single-row input', {
      width: 4, height: 1,
      data: Uint8ClampedArray.from([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 128,
      ]),
    }, 'ea40b73ade951d4d22061b1eb407ceaf3035a145b358468fabaff4b8be322b0e'],
  ] as const)('matches upstream for %s', (_name, image, expected) => {
    expect(digest(image)).toBe(expected)
  })

  it('produces identical input for added borders, inverted colors and transparent backgrounds', () => {
    const input = formula()
    const expected = digest(input)
    const inverse = Uint8ClampedArray.from(input.data, (value, i) => i % 4 === 3 ? value : 255 - value)
    const transparent = input.data.slice()
    for (let i = 0; i < transparent.length; i += 4) {
      transparent[i + 3] = 255 - input.data[i]
      transparent[i] = transparent[i + 1] = transparent[i + 2] = 0
    }
    for (const image of [
      padded(input, 12, 12, 12, 12),
      padded(input, 31, 4, 2, 27),
      { ...input, data: inverse },
      { ...input, data: transparent },
    ]) expect(digest(image)).toBe(expected)
  })

  it('adds a background margin when ink touches the image edges', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(255)
    for (const index of [0, 4, 12, 20, 24]) data.fill(0, index * 4, index * 4 + 3)
    const input = { width: 5, height: 5, data }
    expect(digest(input)).toBe(digest(padded(input, 4, 4, 4, 4)))
  })

  it('keeps blank images finite and rejects malformed dimensions', () => {
    const input = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) }
    expect(prepareTypLensPixels(input, 384).every(value => value === 1)).toBe(true)
    expect(() => prepareTypLensPixels({ ...input, width: 0 }, 384)).toThrow(/dimensions/)
    expect(() => prepareTypLensPixels({ ...input, height: 3 }, 384)).toThrow(/dimensions/)
    expect(() => prepareTypLensPixels({ ...input, width: 50_000_001 }, 384)).toThrow(/dimensions/)
  })
})
