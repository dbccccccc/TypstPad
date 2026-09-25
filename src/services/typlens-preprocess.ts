// Pillow-compatible bicubic resize, including antialiasing and its 22-bit
// coefficient / 8-bit intermediate rounding. See public/im2typst/PILLOW-LICENSE.
const PRECISION = 2 ** 22
const MAX_IMAGE_PIXELS = 50_000_000

// TypLens V1.1's native-content-box-gray-v2 training/inference contract.
// See public/im2typst/model/INFERENCE.md and THIRD_PARTY_NOTICES.md.
export const TYPLENS_PREPROCESSING = {
  version: 'native-content-box-gray-v2',
  channels: 1,
  width: 384,
  height: 384,
  grayscale_weights: [77, 150, 29],
  grayscale_divisor: 256,
  alpha_background: 255,
  foreground_delta: 12,
  margin_ratio: 0.02,
  min_margin: 1,
  polarity: 'perimeter-median-below-128',
  resampler: 'pillow-bicubic-u8-v1',
  mean: [0.5],
  std: [0.5],
} as const

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
      cubic((start + offset - center + 0.5) * (1 / filterScale))
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

function normalizeContent(image: Pick<ImageData, 'data' | 'width' | 'height'>) {
  const { data, width, height } = image
  if (
    !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    width * height > MAX_IMAGE_PIXELS || data.length !== width * height * 4
  ) {
    throw new Error('Invalid formula image dimensions.')
  }

  const gray = new Uint8Array(width * height)
  const histogram = new Uint32Array(256)
  let edgeCount = 0
  const { alpha_background, grayscale_weights, grayscale_divisor } = TYPLENS_PREPROCESSING
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const offset = index * 4
      const alpha = data[offset + 3]
      let weighted = 0
      for (let channel = 0; channel < 3; channel += 1) {
        const composite = Math.floor(
          (data[offset + channel] * alpha + alpha_background * (255 - alpha) + 127) / 255
        )
        weighted += grayscale_weights[channel] * composite
      }
      gray[index] = Math.floor((weighted + 128) / grayscale_divisor)
      // Count corners once, including images that are only one pixel wide/high.
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        histogram[gray[index]] += 1
        edgeCount += 1
      }
    }
  }

  let background = 255
  let cumulative = 0
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value]
    if (cumulative > Math.floor((edgeCount - 1) / 2)) {
      background = value
      break
    }
  }
  const inverted = background < 128
  if (inverted) background = 255 - background

  let left = width, top = height, right = -1, bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (inverted) gray[index] = 255 - gray[index]
      if (gray[index] <= background - TYPLENS_PREPROCESSING.foreground_delta) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }

  if (right < 0) return { pixels: gray, width, height }
  const margin = Math.max(
    TYPLENS_PREPROCESSING.min_margin,
    Math.floor((bottom - top + 1) * TYPLENS_PREPROCESSING.margin_ratio + 0.5)
  )
  const sourceWidth = right - left + 1 + 2 * margin
  const sourceHeight = bottom - top + 1 + 2 * margin
  if (sourceWidth * sourceHeight > MAX_IMAGE_PIXELS) {
    throw new Error('Normalized formula image is too large. Choose a smaller formula image.')
  }
  left -= margin
  top -= margin
  const pixels = new Uint8Array(sourceWidth * sourceHeight).fill(background)
  for (let y = 0; y < sourceHeight; y += 1) {
    const originalY = top + y
    if (originalY < 0 || originalY >= height) continue
    for (let x = 0; x < sourceWidth; x += 1) {
      const originalX = left + x
      if (originalX >= 0 && originalX < width) {
        pixels[y * sourceWidth + x] = gray[originalY * width + originalX]
      }
    }
  }
  return { pixels, width: sourceWidth, height: sourceHeight }
}

export function prepareTypLensPixels(
  image: Pick<ImageData, 'data' | 'width' | 'height'>,
  size: number
): Float32Array {
  const { pixels, width, height } = normalizeContent(image)
  const horizontal = filters(width, size)
  const vertical = filters(height, size)
  const intermediate = new Uint8Array(size * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const { start, weights } = horizontal[x]
      let sum = PRECISION / 2
      for (let offset = 0; offset < weights.length; offset += 1) {
        sum += pixels[y * width + start + offset] * weights[offset]
      }
      intermediate[y * size + x] = clip(sum)
    }
  }

  const tensor = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    const { start, weights } = vertical[y]
    for (let x = 0; x < size; x += 1) {
      let sum = PRECISION / 2
      for (let offset = 0; offset < weights.length; offset += 1) {
        sum += intermediate[(start + offset) * size + x] * weights[offset]
      }
      tensor[y * size + x] = (Math.fround(clip(sum) / 255) - 0.5) / 0.5
    }
  }
  return tensor
}
