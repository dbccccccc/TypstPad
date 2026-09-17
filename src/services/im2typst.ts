import { prepareTypLensPixels } from './typlens-preprocess'

const MODEL_RELEASE = 'typlens-v1-int8-10f682efb979'
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

export type RecognitionSafetyIssue = 'empty-output' | 'missing-eos' | 'reserved-token' | 'invalid-utf8'

export interface RecognitionResult {
  accepted: boolean
  decoderMilliseconds: number
  encoderMilliseconds: number
  inputHeight: number
  inputWidth: number
  safetyIssue: RecognitionSafetyIssue | null
  text: string
  tokenCount: number
  tokenScore: number
  totalMilliseconds: number
}

export interface RecognizerInfo {
  modelBytes: number
  modelName: string
  parameters: number
}

interface ArtifactRecord {
  bytes: number
  sha256: string
}

interface AssetManifest {
  release: string
  model_variant: string
  model: Record<string, ArtifactRecord>
}

interface ModelConfig {
  decoder: {
    d_model: number
    decoder_attention_heads: number
    decoder_layers: number
    max_position_embeddings: number
    vocab_size: number
  }
  encoder: { image_size: number; num_channels: number }
  decoder_start_token_id: number
  eos_token_id: number
  vocab_size: number
}

interface GenerationConfig {
  decoder_start_token_id: number
  eos_token_id: number
  max_new_tokens: number
}

interface PreprocessorConfig {
  do_center_crop: boolean
  do_normalize: boolean
  do_rescale: boolean
  do_resize: boolean
  image_mean: number[]
  image_std: number[]
  resample: number
  rescale_factor: number
  size: { height: number; width: number }
}

type TokenBytes = (number[] | null)[]

interface OrtTensor {
  data: Float32Array
  dispose: () => void
}

interface OrtSession {
  run: (feeds: Record<string, OrtTensor>) => Promise<Record<string, OrtTensor>>
  release: () => Promise<void>
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

interface LoadedRecognizer {
  config: ModelConfig
  decoder: OrtSession
  encoder: OrtSession
  generation: GenerationConfig
  info: RecognizerInfo
  ort: OrtApi
  tokenBytes: TokenBytes
}

type ProgressListener = (progress: RecognizerProgress) => void

const progressListeners = new Set<ProgressListener>()
let latestProgress: RecognizerProgress | null = null
let recognizerPromise: Promise<LoadedRecognizer> | null = null
let runtimeScriptPromise: Promise<void> | null = null
let recognitionRunning = false

function emitProgress(progress: RecognizerProgress): void {
  latestProgress = progress
  for (const listener of progressListeners) listener(progress)
}

export function subscribeToRecognizerProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener)
  if (latestProgress) listener(latestProgress)
  return () => progressListeners.delete(listener)
}

function assetUrl(relativePath: string): string {
  const base = new URL(`${import.meta.env.BASE_URL}im2typst/`, window.location.origin)
  const url = new URL(relativePath, base)
  url.searchParams.set('release', MODEL_RELEASE)
  return url.href
}

async function ensureOnnxRuntime(): Promise<OrtApi> {
  const existing = (globalThis as typeof globalThis & { ort?: OrtApi }).ort
  if (existing) return existing

  if (!runtimeScriptPromise) {
    runtimeScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = assetUrl('ort/ort.wasm.min.js')
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

async function fetchAsset(relativePath: string): Promise<Response> {
  const response = await fetch(assetUrl(relativePath))
  if (!response.ok) {
    throw new Error(`Could not load ${relativePath} (${response.status} ${response.statusText}).`)
  }
  return response
}

async function verifyArtifact(bytes: Uint8Array, name: string, expected?: ArtifactRecord): Promise<void> {
  if (!expected || !Number.isInteger(expected.bytes) || !/^[0-9a-f]{64}$/.test(expected.sha256)) {
    throw new Error(`The model manifest has no valid artifact record for ${name}.`)
  }
  if (bytes.byteLength !== expected.bytes) {
    throw new Error(`${name} size mismatch: expected ${expected.bytes}, received ${bytes.byteLength}.`)
  }
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (hash !== expected.sha256) throw new Error(`${name} failed SHA-256 verification.`)
}

async function fetchMetadata<T>(name: string, manifest: AssetManifest): Promise<T> {
  const bytes = new Uint8Array(await (await fetchAsset(`model/${name}`)).arrayBuffer())
  await verifyArtifact(bytes, name, manifest.model[name])
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

async function fetchWeights(
  name: string,
  stage: RecognizerStage,
  startPercent: number,
  endPercent: number,
  manifest: AssetManifest
): Promise<Uint8Array> {
  emitProgress({ stage, percent: startPercent })
  const response = await fetchAsset(`model/${name}`)
  const total = manifest.model[name]?.bytes ?? 0
  if (!response.body || !total) return new Uint8Array(await response.arrayBuffer())

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    emitProgress({
      stage,
      percent: startPercent + Math.round((endPercent - startPercent) * Math.min(loaded / total, 1)),
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

function validateMetadata(
  config: ModelConfig,
  generation: GenerationConfig,
  preprocess: PreprocessorConfig,
  tokenBytes: TokenBytes
): void {
  if (
    config.encoder.image_size !== 384 || config.encoder.num_channels !== 3 ||
    config.decoder.d_model !== 256 || config.decoder.decoder_attention_heads !== 8 ||
    config.decoder.decoder_layers !== 6 || config.decoder.vocab_size !== 1199 ||
    config.vocab_size !== 1199 || config.decoder_start_token_id !== 1 || config.eos_token_id !== 2 ||
    generation.decoder_start_token_id !== 1 || generation.eos_token_id !== 2 ||
    generation.max_new_tokens !== 1023 || config.decoder.max_position_embeddings < 1024 ||
    preprocess.size.height !== 384 || preprocess.size.width !== 384 ||
    preprocess.do_center_crop !== false || !preprocess.do_normalize ||
    !preprocess.do_rescale || !preprocess.do_resize || preprocess.resample !== 3 ||
    preprocess.rescale_factor !== 1 / 255 ||
    preprocess.image_mean.length !== 3 || preprocess.image_mean.some((value) => value !== 0.5) ||
    preprocess.image_std.length !== 3 || preprocess.image_std.some((value) => value !== 0.5) ||
    !Array.isArray(tokenBytes) || tokenBytes.length !== 1199 ||
    tokenBytes.some((bytes, index) => index < 5
      ? bytes !== null
      : !Array.isArray(bytes) || !bytes.length || bytes.some((byte) =>
          !Number.isInteger(byte) || byte < 0 || byte > 255))
  ) {
    throw new Error('The bundled metadata does not match the TypLens-V1 inference contract.')
  }
}

async function loadRecognizer(): Promise<LoadedRecognizer> {
  emitProgress({ stage: 'loadingRuntime', percent: 3 })
  const ort = await ensureOnnxRuntime()
  ort.env.wasm.numThreads = globalThis.crossOriginIsolated
    ? Math.min(4, navigator.hardwareConcurrency || 1)
    : 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = {
    mjs: assetUrl('ort/ort-wasm-simd-threaded.mjs'),
    wasm: assetUrl('ort/ort-wasm-simd-threaded.wasm'),
  }
  ort.env.logLevel = 'warning'

  emitProgress({ stage: 'loadingMetadata', percent: 8 })
  const manifest = await (await fetchAsset('asset-manifest.json')).json() as AssetManifest
  if (manifest.release !== MODEL_RELEASE || manifest.model_variant !== 'int8') {
    throw new Error('TypstPad requires the bundled TypLens-V1 INT8 release.')
  }
  const [config, generation, preprocess, tokenBytes] = await Promise.all([
    fetchMetadata<ModelConfig>('config.json', manifest),
    fetchMetadata<GenerationConfig>('generation_config.json', manifest),
    fetchMetadata<PreprocessorConfig>('preprocessor_config.json', manifest),
    fetchMetadata<TokenBytes>('token-bytes.json', manifest),
  ])
  validateMetadata(config, generation, preprocess, tokenBytes)

  const encoderBytes = await fetchWeights('encoder.int8.onnx', 'downloadingEncoder', 10, 45, manifest)
  const decoderBytes = await fetchWeights('decoder.int8.onnx', 'downloadingDecoder', 45, 62, manifest)
  emitProgress({ stage: 'verifyingModel', percent: 66 })
  await Promise.all([
    verifyArtifact(encoderBytes, 'encoder.int8.onnx', manifest.model['encoder.int8.onnx']),
    verifyArtifact(decoderBytes, 'decoder.int8.onnx', manifest.model['decoder.int8.onnx']),
  ])

  const options = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
  emitProgress({ stage: 'initializingModel', percent: 72 })
  const encoder = await ort.InferenceSession.create(encoderBytes, options)
  let decoder: OrtSession
  try {
    emitProgress({ stage: 'initializingModel', percent: 88 })
    decoder = await ort.InferenceSession.create(decoderBytes, options)
  } catch (error) {
    await encoder.release()
    throw error
  }

  emitProgress({ stage: 'ready', percent: 100 })
  return {
    config, decoder, encoder, generation, ort, tokenBytes,
    info: {
      modelBytes: manifest.model['encoder.int8.onnx'].bytes + manifest.model['decoder.int8.onnx'].bytes,
      modelName: 'TypLens-V1 INT8',
      parameters: 29_403_264,
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
  return getRecognizer().then(({ info }) => info)
}

export function validateFormulaImage(blob: Blob): void {
  if (!blob || blob.size === 0) throw new Error('The selected image is empty.')
  if (blob.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 20 MB.')
  if (blob.type && !SUPPORTED_IMAGE_TYPES.has(blob.type)) {
    throw new Error('Use a PNG, JPEG, or WebP image.')
  }
}

async function preprocessImage(blob: Blob, size: number): Promise<Float32Array> {
  const url = URL.createObjectURL(blob)
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  try {
    await image.decode()
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height || width * height > MAX_IMAGE_PIXELS || width > 32767 || height > 32767) {
      throw new Error('Choose an image under 50 megapixels and 32,768 pixels per side.')
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
    if (!context) throw new Error('This browser does not provide a 2D canvas context.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0)
    return prepareTypLensPixels(context.getImageData(0, 0, width, height), size)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function safeDispose(tensor: OrtTensor | undefined): void {
  try {
    tensor?.dispose()
  } catch {
    // A failed run may already have released its tensors.
  }
}

async function runRecognition(model: LoadedRecognizer, pixels: Float32Array): Promise<RecognitionResult> {
  const { config, decoder, encoder, generation, ort, tokenBytes } = model
  const size = config.encoder.image_size
  const image = new ort.Tensor('float32', pixels, [1, 3, size, size])
  const cacheShape = [config.decoder.decoder_layers, 1, config.decoder.decoder_attention_heads, 0,
    config.decoder.d_model / config.decoder.decoder_attention_heads]
  let selfKeys: OrtTensor | undefined
  let selfValues: OrtTensor | undefined
  let encoded: Record<string, OrtTensor> | undefined
  const bytes: number[] = []
  let tokenCount = 0
  let scoredTokens = 0
  let logProbability = 0
  let eosReached = false
  let safetyIssue: RecognitionSafetyIssue | null = null
  const totalStarted = performance.now()

  try {
    emitProgress({ stage: 'encoding', percent: 8 })
    const encoderStarted = performance.now()
    encoded = await encoder.run({ pixel_values: image })
    const encoderMilliseconds = performance.now() - encoderStarted
    selfKeys = new ort.Tensor('float32', new Float32Array(0), cacheShape)
    selfValues = new ort.Tensor('float32', new Float32Array(0), cacheShape)
    let current = generation.decoder_start_token_id
    const decoderStarted = performance.now()

    for (let position = 0; position < generation.max_new_tokens; position += 1) {
      const token = new ort.Tensor('int64', BigInt64Array.from([BigInt(current)]), [1, 1])
      let result: Record<string, OrtTensor>
      try {
        result = await decoder.run({
          token_ids: token,
          self_keys: selfKeys,
          self_values: selfValues,
          cross_keys: encoded.cross_keys,
          cross_values: encoded.cross_values,
        })
      } finally {
        safeDispose(token)
      }
      const previousKeys = selfKeys
      const previousValues = selfValues
      selfKeys = result.self_keys_out
      selfValues = result.self_values_out
      safeDispose(previousKeys)
      safeDispose(previousValues)
      try {
        const logits = result.logits.data
        if (logits.length !== config.vocab_size || !logits.every(Number.isFinite)) {
          throw new Error('TypLens returned invalid token scores.')
        }
        current = 0
        for (let index = 1; index < logits.length; index += 1) {
          if (logits[index] > logits[current]) current = index
        }
        let denominator = 0
        for (const value of logits) denominator += Math.exp(value - logits[current])
        logProbability -= Math.log(denominator)
        scoredTokens += 1
      } finally {
        safeDispose(result.logits)
      }

      if (current === generation.eos_token_id) {
        eosReached = true
        break
      }
      const content = tokenBytes[current]
      if (current < 5 || !content) {
        safetyIssue = 'reserved-token'
        break
      }
      bytes.push(...content)
      tokenCount += 1
      if (tokenCount === 1 || tokenCount % 4 === 0) {
        emitProgress({
          stage: 'decoding',
          percent: Math.min(12 + Math.round((tokenCount / generation.max_new_tokens) * 88), 99),
          tokenCount,
        })
      }
      if (tokenCount % 8 === 0) await new Promise((resolve) => globalThis.setTimeout(resolve, 0))
    }

    const decoderMilliseconds = performance.now() - decoderStarted
    let text = ''
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Uint8Array.from(bytes))
    } catch {
      safetyIssue ??= 'invalid-utf8'
    }
    if (!eosReached) safetyIssue ??= 'missing-eos'
    if (!text.trim()) safetyIssue ??= 'empty-output'

    return {
      accepted: safetyIssue === null,
      decoderMilliseconds, encoderMilliseconds,
      inputHeight: size, inputWidth: size,
      safetyIssue, text, tokenCount,
      tokenScore: scoredTokens ? Math.exp(logProbability / scoredTokens) : 0,
      totalMilliseconds: performance.now() - totalStarted,
    }
  } finally {
    safeDispose(image)
    safeDispose(selfKeys)
    safeDispose(selfValues)
    if (encoded) Object.values(encoded).forEach(safeDispose)
  }
}

export async function recognizeFormulaImage(blob: Blob): Promise<RecognitionResult> {
  validateFormulaImage(blob)
  if (recognitionRunning) throw new Error('A formula is still being recognized. Please wait and try again.')
  recognitionRunning = true
  try {
    const model = await getRecognizer()
    emitProgress({ stage: 'preprocessing', percent: 2 })
    const pixels = await preprocessImage(blob, model.config.encoder.image_size)
    return await runRecognition(model, pixels)
  } finally {
    recognitionRunning = false
  }
}

export function recognitionToEditorCode(text: string, simplifiedFormulaMode: boolean): string {
  const formula = text.trim()
  return simplifiedFormulaMode ? formula : `$ ${formula} $`
}
