import type { SavedFormula, FormulaStorage } from '../types/formula'

const STORAGE_KEY = 'typst-editor-formulas'
const CURRENT_VERSION = 1

const defaultStorage: FormulaStorage = {
  currentDraft: '',
  savedFormulas: [],
  version: CURRENT_VERSION,
}

export function loadFormulaStorage(): FormulaStorage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultStorage
    return { ...defaultStorage, ...JSON.parse(saved) }
  } catch {
    return defaultStorage
  }
}

export function saveFormulaStorage(storage: FormulaStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

export function saveDraft(content: string): void {
  const storage = loadFormulaStorage()
  storage.currentDraft = content
  saveFormulaStorage(storage)
}

export function addFormula(name: string, content: string): SavedFormula {
  const storage = loadFormulaStorage()
  const formula: SavedFormula = {
    id: crypto.randomUUID(),
    name: name || generateDefaultName(content),
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

function generateDefaultName(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  return trimmed.length > 20 ? trimmed.slice(0, 20) + '...' : trimmed || 'Untitled'
}
