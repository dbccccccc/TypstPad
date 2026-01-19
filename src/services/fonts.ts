import { createTypstFontBuilder } from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs'
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'

export type FontCategory = 'text' | 'math' | 'mono'

export interface BundledFont {
  id: string
  fileName: string
  family: string
  label: string
  category: FontCategory
  isDefault: boolean
}

export interface UploadedFont {
  id: string
  fileName: string
  family: string
  data: ArrayBuffer
  style?: string
  weight?: number
  addedAt: number
  fingerprint?: string
}

const BUNDLED_FONTS: BundledFont[] = [
  {
    id: 'LibertinusSerif-Regular.otf',
    fileName: 'LibertinusSerif-Regular.otf',
    family: 'Libertinus Serif',
    label: 'Regular',
    category: 'text',
    isDefault: true,
  },
  {
    id: 'LibertinusSerif-Italic.otf',
    fileName: 'LibertinusSerif-Italic.otf',
    family: 'Libertinus Serif',
    label: 'Italic',
    category: 'text',
    isDefault: true,
  },
  {
    id: 'LibertinusSerif-Bold.otf',
    fileName: 'LibertinusSerif-Bold.otf',
    family: 'Libertinus Serif',
    label: 'Bold',
    category: 'text',
    isDefault: true,
  },
  {
    id: 'LibertinusSerif-BoldItalic.otf',
    fileName: 'LibertinusSerif-BoldItalic.otf',
    family: 'Libertinus Serif',
    label: 'Bold Italic',
    category: 'text',
    isDefault: true,
  },
  {
    id: 'LibertinusSerif-Semibold.otf',
    fileName: 'LibertinusSerif-Semibold.otf',
    family: 'Libertinus Serif',
    label: 'Semibold',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'LibertinusSerif-SemiboldItalic.otf',
    fileName: 'LibertinusSerif-SemiboldItalic.otf',
    family: 'Libertinus Serif',
    label: 'Semibold Italic',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'NewCMMath-Book.otf',
    fileName: 'NewCMMath-Book.otf',
    family: 'New Computer Modern Math',
    label: 'Book',
    category: 'math',
    isDefault: true,
  },
  {
    id: 'NewCMMath-Bold.otf',
    fileName: 'NewCMMath-Bold.otf',
    family: 'New Computer Modern Math',
    label: 'Bold',
    category: 'math',
    isDefault: true,
  },
  {
    id: 'NewCMMath-Regular.otf',
    fileName: 'NewCMMath-Regular.otf',
    family: 'New Computer Modern Math',
    label: 'Regular',
    category: 'math',
    isDefault: false,
  },
  {
    id: 'NewCM10-Regular.otf',
    fileName: 'NewCM10-Regular.otf',
    family: 'New Computer Modern',
    label: 'Regular',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'NewCM10-Italic.otf',
    fileName: 'NewCM10-Italic.otf',
    family: 'New Computer Modern',
    label: 'Italic',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'NewCM10-Bold.otf',
    fileName: 'NewCM10-Bold.otf',
    family: 'New Computer Modern',
    label: 'Bold',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'NewCM10-BoldItalic.otf',
    fileName: 'NewCM10-BoldItalic.otf',
    family: 'New Computer Modern',
    label: 'Bold Italic',
    category: 'text',
    isDefault: false,
  },
  {
    id: 'DejaVuSansMono.ttf',
    fileName: 'DejaVuSansMono.ttf',
    family: 'DejaVu Sans Mono',
    label: 'Regular',
    category: 'mono',
    isDefault: false,
  },
  {
    id: 'DejaVuSansMono-Oblique.ttf',
    fileName: 'DejaVuSansMono-Oblique.ttf',
    family: 'DejaVu Sans Mono',
    label: 'Oblique',
    category: 'mono',
    isDefault: false,
  },
  {
    id: 'DejaVuSansMono-Bold.ttf',
    fileName: 'DejaVuSansMono-Bold.ttf',
    family: 'DejaVu Sans Mono',
    label: 'Bold',
    category: 'mono',
    isDefault: false,
  },
  {
    id: 'DejaVuSansMono-BoldOblique.ttf',
    fileName: 'DejaVuSansMono-BoldOblique.ttf',
    family: 'DejaVu Sans Mono',
    label: 'Bold Oblique',
    category: 'mono',
    isDefault: false,
  },
]

const DEFAULT_BUNDLED_IDS = BUNDLED_FONTS.filter(font => font.isDefault).map(font => font.id)
const BUNDLED_FONT_ID_SET = new Set(BUNDLED_FONTS.map(font => font.id))

const STORAGE_KEY = 'typst-fonts-installed-v1'
const DB_NAME = 'typstpad-fonts'
const DB_VERSION = 1
const STORE_NAME = 'fonts'

interface FontState {
  bundledIds: string[]
  uploadedFonts: UploadedFont[]
}

let fontState: FontState | null = null
let fontStatePromise: Promise<FontState> | null = null
let fontInfoBuilderPromise: Promise<ReturnType<typeof createTypstFontBuilder>> | null = null

export function getBundledFonts(): BundledFont[] {
  return BUNDLED_FONTS
}

export function getDefaultBundledFontIds(): string[] {
  return [...DEFAULT_BUNDLED_IDS]
}

function normalizeBundledIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_BUNDLED_IDS]
  const valid = raw.filter((id): id is string => typeof id === 'string' && BUNDLED_FONT_ID_SET.has(id))
  return Array.from(new Set(valid))
}

function saveBundledIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

function loadBundledIdsFromStorage(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      saveBundledIds(DEFAULT_BUNDLED_IDS)
      return [...DEFAULT_BUNDLED_IDS]
    }
    const parsed = JSON.parse(saved)
    const normalized = normalizeBundledIds(parsed)
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveBundledIds(normalized)
    }
    return normalized
  } catch {
    saveBundledIds(DEFAULT_BUNDLED_IDS)
    return [...DEFAULT_BUNDLED_IDS]
  }
}

function openFontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open font database'))
  })
}

async function getAllUploadedFonts(): Promise<UploadedFont[]> {
  const db = await openFontDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as UploadedFont[])
    request.onerror = () => reject(request.error ?? new Error('Failed to read uploaded fonts'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
    tx.onabort = () => db.close()
  })
}

async function saveUploadedFont(font: UploadedFont): Promise<void> {
  const db = await openFontDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(font)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Failed to store uploaded font'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
    tx.onabort = () => db.close()
  })
}

async function deleteUploadedFont(id: string): Promise<void> {
  const db = await openFontDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Failed to delete uploaded font'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
    tx.onabort = () => db.close()
  })
}

async function getFontInfoBuilder() {
  if (!fontInfoBuilderPromise) {
    fontInfoBuilderPromise = (async () => {
      const builder = createTypstFontBuilder()
      await builder.init({
        getModule: () => WebAssembly.compileStreaming(fetch(compilerWasm))
      })
      return builder
    })().catch((error) => {
      fontInfoBuilderPromise = null
      throw error
    })
  }
  return fontInfoBuilderPromise
}

async function extractFontMetadata(data: Uint8Array): Promise<{
  family: string
  style?: string
  weight?: number
}> {
  const builder = await getFontInfoBuilder()
  const info = await builder.getFontInfo(data)
  const fontInfo = (info as { info?: Array<{ family?: string; variant?: { style?: string; weight?: number } }> }).info
  const primary = fontInfo && fontInfo.length > 0 ? fontInfo[0] : undefined
  return {
    family: primary?.family || 'Unknown Font',
    style: primary?.variant?.style,
    weight: primary?.variant?.weight,
  }
}

function fallbackFontFingerprint(bytes: Uint8Array): string {
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return `${hex}-${bytes.length}`
}

async function createFontFingerprint(data: ArrayBuffer): Promise<string> {
  if (crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map(value => value.toString(16).padStart(2, '0'))
      .join('')
  }
  return fallbackFontFingerprint(new Uint8Array(data))
}

async function ensureUploadedFontFingerprint(font: UploadedFont): Promise<string> {
  if (font.fingerprint) return font.fingerprint
  const fingerprint = await createFontFingerprint(font.data)
  font.fingerprint = fingerprint
  return fingerprint
}

async function dedupeUploadedFonts(fonts: UploadedFont[]): Promise<UploadedFont[]> {
  const seen = new Set<string>()
  const unique: UploadedFont[] = []
  for (const font of fonts) {
    const fingerprint = await ensureUploadedFontFingerprint(font)
    if (seen.has(fingerprint)) {
      try {
        await deleteUploadedFont(font.id)
      } catch {
      }
      continue
    }
    seen.add(fingerprint)
    unique.push(font)
  }
  return unique
}

async function loadFontState(): Promise<FontState> {
  if (fontState) return fontState
  if (!fontStatePromise) {
    fontStatePromise = (async () => {
      const bundledIds = loadBundledIdsFromStorage()
      let uploadedFonts: UploadedFont[] = []
      try {
        uploadedFonts = await getAllUploadedFonts()
        uploadedFonts.sort((a, b) => b.addedAt - a.addedAt)
        uploadedFonts = await dedupeUploadedFonts(uploadedFonts)
      } catch (error) {
        console.error('Failed to load uploaded fonts:', error)
      }
      fontState = { bundledIds, uploadedFonts }
      fontStatePromise = null
      return fontState
    })().catch((error) => {
      fontStatePromise = null
      throw error
    })
  }
  return fontStatePromise
}

export async function getInstalledBundledFontIds(): Promise<string[]> {
  const state = await loadFontState()
  return [...state.bundledIds]
}

export async function setInstalledBundledFontIds(ids: string[]): Promise<void> {
  const normalized = normalizeBundledIds(ids)
  saveBundledIds(normalized)
  const state = await loadFontState()
  state.bundledIds = normalized
}

export async function getUploadedFonts(): Promise<UploadedFont[]> {
  const state = await loadFontState()
  return [...state.uploadedFonts]
}

export async function addUploadedFonts(files: File[]): Promise<UploadedFont[]> {
  const state = await loadFontState()
  const added: UploadedFont[] = []
  const existingFingerprints = new Set<string>()
  for (const font of state.uploadedFonts) {
    existingFingerprints.add(await ensureUploadedFontFingerprint(font))
  }
  for (const file of files) {
    const buffer = await file.arrayBuffer()
    const fingerprint = await createFontFingerprint(buffer)
    if (existingFingerprints.has(fingerprint)) {
      continue
    }
    const data = new Uint8Array(buffer)
    const meta = await extractFontMetadata(data)
    const font: UploadedFont = {
      id: crypto.randomUUID(),
      fileName: file.name,
      family: meta.family,
      data: buffer,
      style: meta.style,
      weight: meta.weight,
      fingerprint,
      addedAt: Date.now(),
    }
    await saveUploadedFont(font)
    state.uploadedFonts = [font, ...state.uploadedFonts]
    added.push(font)
    existingFingerprints.add(fingerprint)
  }
  return added
}

export async function removeUploadedFont(id: string): Promise<void> {
  const state = await loadFontState()
  await deleteUploadedFont(id)
  state.uploadedFonts = state.uploadedFonts.filter(font => font.id !== id)
}

export async function getFontSources(): Promise<{
  urls: string[]
  data: Uint8Array[]
  families: Set<string>
}> {
  const state = await loadFontState()
  const bundledFonts = BUNDLED_FONTS.filter(font => state.bundledIds.includes(font.id))
  const urls = bundledFonts.map(font => `/fonts/${font.fileName}`)
  const data = state.uploadedFonts.map(font => new Uint8Array(font.data))
  const families = new Set<string>()
  for (const font of bundledFonts) families.add(font.family)
  for (const font of state.uploadedFonts) families.add(font.family)
  return { urls, data, families }
}
