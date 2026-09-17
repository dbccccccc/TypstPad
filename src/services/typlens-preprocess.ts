// Pillow-compatible bicubic resize, including antialiasing and its 22-bit
// coefficient / 8-bit intermediate rounding. See public/im2typst/PILLOW-LICENSE.
const PRECISION = 2 ** 22

interface Filter {
  start: number
  weights: number[]
}

function cubic(value: number): number {
  const x = Math.abs(value)
  if (x < 1) return ((1.5 * x - 2.5) * x) * x + 1
  if (x < 2) return (((x - 5) * x + 8) * x - 4) * -0.5
  return 0
}

function filters(inputSize: number, outputSize: number): Filter[] {
  const scale = inputSize / outputSize
  const filterScale = Math.max(scale, 1)
  const support = 2 * filterScale
  return Array.from({ length: outputSize }, (_, index) => {
    const center = (index + 0.5) * scale
    const start = Math.max(0, Math.trunc(center - support + 0.5))
    const end = Math.min(inputSize, Math.trunc(center + support + 0.5))
    const weights = Array.from({ length: end - start }, (_, offset) =>
      cubic((start + offset - center + 0.5) / filterScale)
    )
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    return {
      start,
      weights: weights.map((weight) => {
        const normalized = weight / total
        return Math.trunc(normalized * PRECISION + (normalized < 0 ? -0.5 : 0.5))
      }),
    }
  })
}

function clip(sum: number): number {
  return Math.max(0, Math.min(255, Math.floor(sum / PRECISION)))
}

export function prepareTypLensPixels(image: ImageData, size: number): Float32Array {
  const { data, width, height } = image
  const horizontal = filters(width, size)
  const vertical = filters(height, size)
  const intermediate = new Uint8Array(size * height * 3)

  // The caller has composited onto white. Keep RGB and the complete image,
  // with no cropping or polarity inversion.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const { start, weights } = horizontal[x]
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = PRECISION / 2
        for (let offset = 0; offset < weights.length; offset += 1) {
          sum += data[(y * width + start + offset) * 4 + channel] * weights[offset]
        }
        intermediate[(y * size + x) * 3 + channel] = clip(sum)
      }
    }
  }

  const planeSize = size * size
  const tensor = new Float32Array(3 * planeSize)
  for (let y = 0; y < size; y += 1) {
    const { start, weights } = vertical[y]
    for (let x = 0; x < size; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        let sum = PRECISION / 2
        for (let offset = 0; offset < weights.length; offset += 1) {
          sum += intermediate[((start + offset) * size + x) * 3 + channel] * weights[offset]
        }
        tensor[channel * planeSize + y * size + x] =
          (Math.fround(clip(sum) / 255) - 0.5) / 0.5
      }
    }
  }
  return tensor
}
