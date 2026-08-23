const MODEL_RELEASE = 'phase10-step002000-29d4a51adc71'
const MAX_FILE_BYTES = 20 * 1_000_000
const MAX_IMAGE_PIXELS = 50_000_000
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export type RecognizerStage =
  | 'loadingRuntime'
  | 'loadingMetadata'
  | 'downloadingEncoder'
  | 'downloadingDecoder'
  | 'verifyingModel'
  | 'initializingModel'
  | 'ready'
  | 'preprocessing'
  | 'encoding'
  | 'decoding'

export interface RecognizerProgress {
  stage: RecognizerStage
  percent?: number
  tokenCount?: number
}

export type RecognitionSafetyIssue =
  | 'empty-output'
  | 'missing-eos'
  | 'numeric-normalization'
  | 'output-policy'
  | 'repetition-guard'
  | 'syntax-repair'

export interface RecognitionResult {
  accepted: boolean
  decoderMilliseconds: number
  encoderMilliseconds: number
  inputHeight: number
  inputWidth: number
  outputPolicyReason: string
  safetyIssue: RecognitionSafetyIssue | null
  text: string
  tokenCount: number
  tokenScore: number
  totalMilliseconds: number
}

export interface RecognizerInfo {
  compileRate: number
  exactMatch: number
  inputHeight: number
  maxInputWidth: number
  modelBytes: number
  modelName: string
  parameters: number
}

interface ArtifactRecord {
  bytes: number
  sha256: string
}

interface ModelConfig {
  attention_heads: number
  bos_id: number
  d_model: number
  decoder_layers: number
  eos_id: number
  input_height: number
  max_image_width: number
  max_sequence_length: number
  schema_version: string
  vocabulary_size: number
}

interface PreprocessConfig {
  auto_crop: boolean
  crop_margin_ratio: number
  crop_min_margin: number
  crop_threshold: number
  input_height: number
  max_width: number
  minimum_foreground_pixels: number
  normalize_polarity: boolean
  resize_mode: string
  schema_version: string
  vertical_alignment: string
  width_buckets: number[]
}

interface Vocabulary {
  schema_version: string
  tokens: string[]
}

interface OutputPolicy {
  allowed_calls: string[]
  allowed_quoted?: string[]
  schema_version: string
  [key: string]: unknown
}

interface Deployment {
  artifacts: Record<string, ArtifactRecord>
  cached_inference_implementation: string
  dataset: Record<string, unknown>
  evaluation: {
    metrics: {
      compile_rate: number
      greedy_exact_match: number
    }
  }
  formula_repair_implementation: string
  max_output_tokens: number
  model_name: string
  numeric_lexeme_normalization: string
  parameters: number
  parity: { int8_all_match: boolean }
  qualification: string
  schema_version: string
  variants: {
    wasm: {
      decoder: string
      encoder: string
      precision: string
    }
  }
  [key: string]: unknown
}

interface PreparedImage {
  bucket: number
  height: number
  pixelWidth: number
  tensorData: Float32Array
}

interface RawRecognitionResult {
  confidence: { geometricMeanProbability: number }
  decoderMilliseconds: number
  encoderMilliseconds: number
  eosReached: boolean
  numericNormalizationCount: number
  repetitionGuardTriggered: boolean
  syntaxRepairCount: number
  text: string
  tokenIds: number[]
  totalMilliseconds: number
}

interface OrtTensor {
  dispose?: () => void
}

interface OrtSession {
  run: (feeds: Record<string, OrtTensor>) => Promise<Record<string, OrtTensor>>
}

interface OrtApi {
  env: {
    logLevel: string
    wasm: {
      numThreads: number
      proxy: boolean
      wasmPaths: { mjs: string; wasm: string }
    }
  }
  InferenceSession: {
    create: (
      model: Uint8Array,
      options: { executionProviders: string[]; graphOptimizationLevel: string }
    ) => Promise<OrtSession>
  }
  Tensor: new (
    type: string,
    data: Float32Array | BigInt64Array,
    dimensions: number[]
  ) => OrtTensor
}

interface CoreRuntime {
  cropToForeground: (
    pixels: Uint8Array,
    width: number,
    height: number,
    options: {
      marginRatio: number
      minimumMargin: number
      minimumPixels: number
      threshold: number
    }
  ) => { height: number; pixels: Uint8Array; width: number }
  grayscaleFromRgba: (rgba: Uint8ClampedArray) => Uint8Array
  normalizePolarity: (
    pixels: Uint8Array,
    width: number,
    height: number,
    enabled: boolean
  ) => { inverted: boolean; pixels: Uint8Array }
  outputPolicyDecision: (
    text: string,
    policy: OutputPolicy
  ) => { accepted: boolean; reason: string }
  outputPolicyIdentityMatchesDataset: (
    policy: OutputPolicy,
    dataset: Record<string, unknown>
  ) => boolean
  resizeGeometry: (
    width: number,
    height: number,
    targetHeight: number,
    maxWidth: number,
    resizeMode: string
  ) => { height: number; top: number; width: number }
  selectWidthBucket: (
    scaledWidth: number,
    widthBuckets: number[],
    maxWidth: number
  ) => number
  sha256Hex: (bytes: Uint8Array) => Promise<string>
  teacherTrialQualificationDecision: (deployment: Deployment) => {
    compileRate: number
    exactMatch: number
    sampleCount: number
  }
}

interface InferenceRuntime {
  runCachedGreedy: (
    model: RecognizerModel,
    prepared: PreparedImage,
    onProgress: (progress: { phase: string; tokenCount: number }) => void
  ) => Promise<RawRecognitionResult>
}

interface RecognizerModel {
  config: ModelConfig
  decoder: OrtSession
  deployment: Deployment
  encoder: OrtSession
  ort: OrtApi
  outputPolicy: OutputPolicy
  preprocess: PreprocessConfig
  vocabulary: Vocabulary
}

interface LoadedRecognizer {
  core: CoreRuntime
  inference: InferenceRuntime
  info: RecognizerInfo
  model: RecognizerModel
}

type ProgressListener = (progress: RecognizerProgress) => void

const progressListeners = new Set<ProgressListener>()
let latestProgress: RecognizerProgress | null = null
let recognizerPromise: Promise<LoadedRecognizer> | null = null

function emitProgress(progress: RecognizerProgress): void {
  latestProgress = progress
  for (const listener of progressListeners) listener(progress)
}

export function subscribeToRecognizerProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener)
  if (latestProgress) listener(latestProgress)
  return () => progressListeners.delete(listener)
}

function assetUrl(relativePath: string, versioned = true): string {
  const basePath = `${import.meta.env.BASE_URL}im2typst/`
  const base = new URL(basePath, window.location.origin)
  const url = new URL(relativePath, base)
  if (versioned) url.searchParams.set('release', MODEL_RELEASE)
  return url.href
}

async function importBrowserModule<T>(relativePath: string): Promise<T> {
  const source = assetUrl(relativePath)
  return import(/* @vite-ignore */ source) as Promise<T>
}

let runtimeScriptPromise: Promise<void> | null = null

async function ensureOnnxRuntime(): Promise<OrtApi> {
  const existing = (globalThis as typeof globalThis & { ort?: OrtApi }).ort
  if (existing) return existing

  if (!runtimeScriptPromise) {
    runtimeScriptPromise = new Promise<void>((resolve, reject) => {
      const source = assetUrl('ort/ort.wasm.min.js')
      const script = document.createElement('script')
      script.src = source
      script.async = true
      script.dataset.typstpadIm2typstRuntime = MODEL_RELEASE
      script.onload = () => resolve()
      script.onerror = () => {
        script.remove()
        reject(new Error('The local ONNX runtime could not be loaded.'))
      }
      document.head.append(script)
    }).catch((error) => {
      runtimeScriptPromise = null
      throw error
    })
  }

  await runtimeScriptPromise
  const loaded = (globalThis as typeof globalThis & { ort?: OrtApi }).ort
  if (!loaded) throw new Error('The ONNX runtime loaded without exposing its browser API.')
  return loaded
}

async function fetchJson<T>(relativePath: string): Promise<T> {
  const response = await fetch(assetUrl(relativePath))
  if (!response.ok) {
    throw new Error(`Could not load ${relativePath} (${response.status} ${response.statusText}).`)
  }
  return response.json() as Promise<T>
}

async function fetchBytes(
  relativePath: string,
  stage: RecognizerStage,
  startPercent: number,
  endPercent: number
): Promise<Uint8Array> {
  const response = await fetch(assetUrl(relativePath))
  if (!response.ok) {
    throw new Error(`Could not load ${relativePath} (${response.status} ${response.statusText}).`)
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body || !total) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    emitProgress({ stage, percent: endPercent })
    return bytes
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    const fraction = Math.min(loaded / total, 1)
    emitProgress({
      stage,
      percent: startPercent + Math.round((endPercent - startPercent) * fraction),
    })
  }

  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function verifyArtifact(
  core: CoreRuntime,
  bytes: Uint8Array,
  name: string,
  expected: ArtifactRecord | undefined
): Promise<void> {
  if (!expected || !Number.isInteger(expected.bytes) || !/^[0-9a-f]{64}$/.test(expected.sha256)) {
    throw new Error(`The deployment has no valid artifact record for ${name}.`)
  }
  if (bytes.byteLength !== expected.bytes) {
    throw new Error(`${name} size mismatch: expected ${expected.bytes}, received ${bytes.byteLength}.`)
  }
  const received = await core.sha256Hex(bytes)
  if (received !== expected.sha256) throw new Error(`${name} failed SHA-256 verification.`)
}

function validateRelease(
  core: CoreRuntime,
  config: ModelConfig,
  preprocess: PreprocessConfig,
  vocabulary: Vocabulary,
  outputPolicy: OutputPolicy,
  deployment: Deployment
): void {
  if (config.schema_version !== 'recognizer-model-v5') {
    throw new Error(`Unsupported model schema: ${config.schema_version}.`)
  }
  if (
    preprocess.schema_version !== 'image-preprocess-v3' ||
    preprocess.resize_mode !== 'contain' ||
    preprocess.vertical_alignment !== 'center'
  ) {
    throw new Error('The model preprocessing geometry is not supported.')
  }
  if (
    preprocess.input_height !== config.input_height ||
    preprocess.max_width !== config.max_image_width
  ) {
    throw new Error('The model and preprocessing dimensions are inconsistent.')
  }
  if (
    vocabulary.schema_version !== 'typst-vocabulary-v1' ||
    vocabulary.tokens.length !== config.vocabulary_size ||
    config.d_model % config.attention_heads !== 0
  ) {
    throw new Error('The model dimensions and vocabulary are inconsistent.')
  }
  if (
    deployment.schema_version !== 'browser-deployment-v1' ||
    deployment.variants?.wasm?.encoder !== 'encoder.int8.onnx' ||
    deployment.variants?.wasm?.decoder !== 'decoder-step.int8.onnx' ||
    deployment.cached_inference_implementation !== 'cached-transformer-step-v2' ||
    deployment.formula_repair_implementation !== 'formula-syntax-repair-v8' ||
    deployment.numeric_lexeme_normalization !== 'formula-numeric-lexeme-v2' ||
    deployment.qualification !== 'experimental-teacher-local-testing-only' ||
    deployment.parity?.int8_all_match !== true
  ) {
    throw new Error('The deployment manifest does not describe the approved experimental INT8 pipeline.')
  }
  if (
    !Number.isInteger(deployment.max_output_tokens) ||
    deployment.max_output_tokens < 4 ||
    deployment.max_output_tokens > config.max_sequence_length
  ) {
    throw new Error('The deployment output limit is incompatible with the model.')
  }
  if (
    !core.outputPolicyDecision('x', outputPolicy).accepted ||
    !core.outputPolicyIdentityMatchesDataset(outputPolicy, deployment.dataset)
  ) {
    throw new Error('The formula output policy is incompatible with this release.')
  }

  // This call verifies that the manifest preserves the model's explicitly
  // uncalibrated, non-production qualification evidence.
  core.teacherTrialQualificationDecision(deployment)
}

async function loadRecognizer(): Promise<LoadedRecognizer> {
  emitProgress({ stage: 'loadingRuntime', percent: 3 })
  const [ort, core, inference] = await Promise.all([
    ensureOnnxRuntime(),
    importBrowserModule<CoreRuntime>('runtime/core.js'),
    importBrowserModule<InferenceRuntime>('runtime/inference-runtime.js'),
  ])

  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = {
    mjs: assetUrl('ort/ort-wasm-simd-threaded.mjs'),
    wasm: assetUrl('ort/ort-wasm-simd-threaded.wasm'),
  }
  ort.env.logLevel = 'warning'

  emitProgress({ stage: 'loadingMetadata', percent: 8 })
  const [config, preprocess, vocabulary, outputPolicy, deployment] = await Promise.all([
    fetchJson<ModelConfig>('model/model-config.json'),
    fetchJson<PreprocessConfig>('model/preprocess-config.json'),
    fetchJson<Vocabulary>('model/vocabulary.json'),
    fetchJson<OutputPolicy>('model/output-policy.json'),
    fetchJson<Deployment>('model/deployment.json'),
  ])
  validateRelease(core, config, preprocess, vocabulary, outputPolicy, deployment)

  const encoderBytes = await fetchBytes(
    'model/encoder.int8.onnx',
    'downloadingEncoder',
    10,
    40
  )
  const decoderBytes = await fetchBytes(
    'model/decoder-step.int8.onnx',
    'downloadingDecoder',
    40,
    62
  )

  emitProgress({ stage: 'verifyingModel', percent: 66 })
  await verifyArtifact(core, encoderBytes, 'encoder.int8.onnx', deployment.artifacts['encoder.int8.onnx'])
  await verifyArtifact(core, decoderBytes, 'decoder-step.int8.onnx', deployment.artifacts['decoder-step.int8.onnx'])

  const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
  emitProgress({ stage: 'initializingModel', percent: 72 })
  const encoder = await ort.InferenceSession.create(encoderBytes, options)
  emitProgress({ stage: 'initializingModel', percent: 88 })
  const decoder = await ort.InferenceSession.create(decoderBytes, options)

  const qualification = core.teacherTrialQualificationDecision(deployment)
  const info: RecognizerInfo = {
    compileRate: qualification.compileRate,
    exactMatch: qualification.exactMatch,
    inputHeight: preprocess.input_height,
    maxInputWidth: preprocess.max_width,
    modelBytes:
      deployment.artifacts['encoder.int8.onnx'].bytes +
      deployment.artifacts['decoder-step.int8.onnx'].bytes,
    modelName: deployment.model_name,
    parameters: deployment.parameters,
  }

  emitProgress({ stage: 'ready', percent: 100 })
  return {
    core,
    inference,
    info,
    model: {
      config,
      decoder,
      deployment,
      encoder,
      ort,
      outputPolicy,
      preprocess,
      vocabulary,
    },
  }
}

function getRecognizer(): Promise<LoadedRecognizer> {
  if (!recognizerPromise) {
    recognizerPromise = loadRecognizer().catch((error) => {
      recognizerPromise = null
      throw error
    })
  }
  return recognizerPromise
}

export function preloadImageRecognizer(): Promise<RecognizerInfo> {
  const recognizer = getRecognizer()
  return recognizer.then(({ info }) => info)
}

export function validateFormulaImage(blob: Blob): void {
  if (!blob || blob.size === 0) throw new Error('The selected image is empty.')
  if (blob.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 20 MB.')
  if (blob.type && !SUPPORTED_IMAGE_TYPES.has(blob.type)) {
    throw new Error('Use a PNG, JPEG, or WebP image.')
  }
}

interface DecodedImage {
  close: () => void
  height: number
  source: CanvasImageSource
  width: number
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if ('createImageBitmap' in globalThis) {
    const bitmap = await createImageBitmap(blob, {
      colorSpaceConversion: 'default',
      imageOrientation: 'from-image',
      premultiplyAlpha: 'default',
    })
    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
    }
  }

  const url = URL.createObjectURL(blob)
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  try {
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('The selected image could not be decoded.')
  }
  return {
    close: () => URL.revokeObjectURL(url),
    height: image.naturalHeight,
    source: image,
    width: image.naturalWidth,
  }
}

function canvasContext(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings
): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', options)
  if (!context) throw new Error('This browser does not provide a 2D canvas context.')
  return context
}

function grayscaleCanvas(grayscale: Uint8Array, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvasContext(canvas, { alpha: false, willReadFrequently: true })
  const imageData = context.createImageData(width, height)
  for (let source = 0, target = 0; source < grayscale.length; source += 1) {
    const value = grayscale[source]
    imageData.data[target] = value
    imageData.data[target + 1] = value
    imageData.data[target + 2] = value
    imageData.data[target + 3] = 255
    target += 4
  }
  context.putImageData(imageData, 0, 0)
  return canvas
}

async function preprocessImage(
  blob: Blob,
  config: PreprocessConfig,
  core: CoreRuntime
): Promise<PreparedImage> {
  const decoded = await decodeImage(blob)
  try {
    if (
      decoded.width < 1 ||
      decoded.height < 1 ||
      decoded.width * decoded.height > MAX_IMAGE_PIXELS
    ) {
      throw new Error('The decoded image is empty or larger than 50 megapixels.')
    }

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = decoded.width
    sourceCanvas.height = decoded.height
    const sourceContext = canvasContext(sourceCanvas, {
      alpha: false,
      willReadFrequently: true,
    })
    sourceContext.fillStyle = '#ffffff'
    sourceContext.fillRect(0, 0, decoded.width, decoded.height)
    sourceContext.drawImage(decoded.source, 0, 0)
    const sourcePixels = sourceContext.getImageData(0, 0, decoded.width, decoded.height).data
    const grayscale = core.grayscaleFromRgba(sourcePixels)
    const polarity = core.normalizePolarity(
      grayscale,
      decoded.width,
      decoded.height,
      config.normalize_polarity
    )
    const cropped = config.auto_crop
      ? core.cropToForeground(polarity.pixels, decoded.width, decoded.height, {
          marginRatio: config.crop_margin_ratio,
          minimumMargin: config.crop_min_margin,
          minimumPixels: config.minimum_foreground_pixels,
          threshold: config.crop_threshold,
        })
      : {
          height: decoded.height,
          pixels: polarity.pixels,
          width: decoded.width,
        }

    const geometry = core.resizeGeometry(
      cropped.width,
      cropped.height,
      config.input_height,
      config.max_width,
      config.resize_mode
    )
    const bucket = core.selectWidthBucket(
      geometry.width,
      config.width_buckets,
      config.max_width
    )

    const normalizedCanvas = grayscaleCanvas(cropped.pixels, cropped.width, cropped.height)
    const resizedCanvas = document.createElement('canvas')
    resizedCanvas.width = geometry.width
    resizedCanvas.height = geometry.height
    const resizedContext = canvasContext(resizedCanvas, {
      alpha: false,
      willReadFrequently: true,
    })
    resizedContext.fillStyle = '#ffffff'
    resizedContext.fillRect(0, 0, geometry.width, geometry.height)
    resizedContext.imageSmoothingEnabled = true
    resizedContext.imageSmoothingQuality = 'high'
    resizedContext.drawImage(
      normalizedCanvas,
      0,
      0,
      cropped.width,
      cropped.height,
      0,
      0,
      geometry.width,
      geometry.height
    )

    const resizedPixels = resizedContext.getImageData(
      0,
      0,
      geometry.width,
      geometry.height
    ).data
    const tensorData = new Float32Array(config.input_height * bucket)
    for (let y = 0; y < geometry.height; y += 1) {
      for (let x = 0; x < geometry.width; x += 1) {
        const sourceIndex = (y * geometry.width + x) * 4
        tensorData[(y + geometry.top) * bucket + x] =
          (255 - resizedPixels[sourceIndex]) / 255
      }
    }

    return {
      bucket,
      height: config.input_height,
      pixelWidth: geometry.width,
      tensorData,
    }
  } finally {
    decoded.close()
  }
}

export async function recognizeFormulaImage(blob: Blob): Promise<RecognitionResult> {
  validateFormulaImage(blob)
  const loaded = await getRecognizer()

  emitProgress({ stage: 'preprocessing', percent: 2 })
  const prepared = await preprocessImage(blob, loaded.model.preprocess, loaded.core)
  emitProgress({ stage: 'encoding', percent: 8 })
  const raw = await loaded.inference.runCachedGreedy(
    loaded.model,
    prepared,
    ({ phase, tokenCount }) => {
      if (phase === 'decoder') {
        emitProgress({
          stage: 'decoding',
          percent: Math.min(12 + Math.round((tokenCount / 256) * 88), 99),
          tokenCount,
        })
      }
    }
  )

  const outputPolicy = loaded.core.outputPolicyDecision(raw.text, loaded.model.outputPolicy)
  let safetyIssue: RecognitionSafetyIssue | null = null
  if (!raw.text.trim()) safetyIssue = 'empty-output'
  else if (raw.repetitionGuardTriggered) safetyIssue = 'repetition-guard'
  else if (!raw.eosReached) safetyIssue = 'missing-eos'
  else if (!outputPolicy.accepted) safetyIssue = 'output-policy'
  else if (raw.syntaxRepairCount > 0) safetyIssue = 'syntax-repair'
  else if (raw.numericNormalizationCount > 0) safetyIssue = 'numeric-normalization'

  return {
    accepted: safetyIssue === null,
    decoderMilliseconds: raw.decoderMilliseconds,
    encoderMilliseconds: raw.encoderMilliseconds,
    inputHeight: prepared.height,
    inputWidth: prepared.pixelWidth,
    outputPolicyReason: outputPolicy.reason,
    safetyIssue,
    text: raw.text,
    tokenCount: raw.tokenIds.length,
    tokenScore: raw.confidence.geometricMeanProbability,
    totalMilliseconds: raw.totalMilliseconds,
  }
}

export function recognitionToEditorCode(text: string, simplifiedFormulaMode: boolean): string {
  const formula = text.trim()
  return simplifiedFormulaMode ? formula : `$ ${formula} $`
}
