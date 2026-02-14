import type { SavedFormula, FormulaStorage } from '../types/formula'

const STORAGE_KEY = 'typst-editor-formulas'
const CURRENT_VERSION = 1

const defaultStorage: FormulaStorage = {
  currentDraft: '',
  savedFormulas: [],
  version: CURRENT_VERSION,
}

function getDefaultStorage(): FormulaStorage {
  return {
    ...defaultStorage,
    savedFormulas: [...defaultStorage.savedFormulas],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSavedFormula(value: unknown): value is SavedFormula {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

function normalizeStorage(raw: unknown): { storage: FormulaStorage; didNormalize: boolean } {
  const defaults = getDefaultStorage()
  if (!isRecord(raw)) {
    return { storage: defaults, didNormalize: true }
  }

  let didNormalize = false
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version !== CURRENT_VERSION) {
    didNormalize = true
  }

  const storage: FormulaStorage = {
    currentDraft: typeof raw.currentDraft === 'string' ? raw.currentDraft : defaults.currentDraft,
    savedFormulas: Array.isArray(raw.savedFormulas)
      ? raw.savedFormulas.filter(isSavedFormula)
      : defaults.savedFormulas,
    version: CURRENT_VERSION,
  }

  if (typeof raw.currentDraft !== 'string' && raw.currentDraft !== undefined) {
    didNormalize = true
  }
  if (Array.isArray(raw.savedFormulas) && storage.savedFormulas.length !== raw.savedFormulas.length) {
    didNormalize = true
  }
  if (!Array.isArray(raw.savedFormulas) && raw.savedFormulas !== undefined) {
    didNormalize = true
  }

  return { storage, didNormalize }
}

export function loadFormulaStorage(): FormulaStorage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return getDefaultStorage()
    const parsed = JSON.parse(saved)
    const { storage, didNormalize } = normalizeStorage(parsed)
    if (didNormalize) {
      saveFormulaStorage(storage)
    }
    return storage
  } catch {
    return getDefaultStorage()
  }
}

function saveFormulaStorage(storage: FormulaStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

export function saveDraft(content: string): void {
  const storage = loadFormulaStorage()
  storage.currentDraft = content
  saveFormulaStorage(storage)
}

export function addFormula(
  name: string,
  content: string,
  options?: { fallbackName?: string }
): SavedFormula {
  const storage = loadFormulaStorage()
  const formula: SavedFormula = {
    id: crypto.randomUUID(),
    name: name || generateDefaultName(content, options?.fallbackName),
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  storage.savedFormulas.unshift(formula)
  saveFormulaStorage(storage)
  return formula
}

export function deleteFormula(id: string): void {
  const storage = loadFormulaStorage()
  storage.savedFormulas = storage.savedFormulas.filter(f => f.id !== id)
  saveFormulaStorage(storage)
}

export function clearAllFormulas(): void {
  const storage = loadFormulaStorage()
  storage.savedFormulas = []
  saveFormulaStorage(storage)
}

export function updateFormula(id: string, updates: Partial<Pick<SavedFormula, 'name' | 'content'>>): void {
  const storage = loadFormulaStorage()
  const index = storage.savedFormulas.findIndex(f => f.id === id)
  if (index !== -1) {
    storage.savedFormulas[index] = {
      ...storage.savedFormulas[index],
      ...updates,
      updatedAt: Date.now(),
    }
    saveFormulaStorage(storage)
  }
}

function generateDefaultName(content: string, fallbackName = 'Untitled'): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  return trimmed.length > 20 ? trimmed.slice(0, 20) + '...' : trimmed || fallbackName
}
