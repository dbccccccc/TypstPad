import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addFormula,
  clearAllFormulas,
  deleteFormula,
  loadFormulaStorage,
  preserveDraft,
  saveDraft,
  updateFormula,
} from './storage'

const STORAGE_KEY = 'typst-editor-formulas'

function createMockStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial))

  return {
    get length() {
      return store.size
    },
    clear: vi.fn(() => {
      store.clear()
    }),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
  }
}

describe('formula storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage())
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'fixed-id'),
    })
    vi.spyOn(Date, 'now').mockReturnValue(123456)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns default storage when nothing has been saved', () => {
    expect(loadFormulaStorage()).toEqual({
      currentDraft: '',
      savedFormulas: [],
      version: 1,
    })
  })

  it('normalizes malformed persisted data and writes the normalized value back', () => {
    const validFormula = {
      id: 'formula-1',
      name: 'Euler',
      content: '$ e^(i pi) + 1 = 0 $',
      createdAt: 1,
      updatedAt: 2,
    }
    const storage = createMockStorage({
      [STORAGE_KEY]: JSON.stringify({
        currentDraft: 42,
        savedFormulas: [
          validFormula,
          { id: 'broken', name: 'Missing fields' },
          { ...validFormula, id: 'bad-mode', simplifiedFormulaMode: 'yes' },
        ],
        version: 0,
      }),
    })
    vi.stubGlobal('localStorage', storage)

    const result = loadFormulaStorage()

    expect(result).toEqual({
      currentDraft: '',
      savedFormulas: [validFormula],
      version: 1,
    })
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(result))
  })

  it('saves, updates, deletes, and clears local formulas without losing the draft', () => {
    saveDraft('$ x $')

    const formula = addFormula('', '   ', { fallbackName: 'Untitled local' })

    expect(formula).toEqual({
      id: 'fixed-id',
      name: 'Untitled local',
      content: '   ',
      createdAt: 123456,
      updatedAt: 123456,
    })
    expect(loadFormulaStorage().currentDraft).toBe('$ x $')

    updateFormula('fixed-id', { name: 'Renamed', content: '$ y $' })
    expect(loadFormulaStorage().savedFormulas[0]).toMatchObject({
      id: 'fixed-id',
      name: 'Renamed',
      content: '$ y $',
    })

    deleteFormula('fixed-id')
    expect(loadFormulaStorage().savedFormulas).toHaveLength(0)

    addFormula('One', '$ 1 $')
    addFormula('Two', '$ 2 $')
    clearAllFormulas()
    expect(loadFormulaStorage()).toMatchObject({
      currentDraft: '$ x $',
      savedFormulas: [],
    })
  })

  it('records the formula mode a formula was saved in', () => {
    expect(addFormula('Plain', '$ x $', { simplifiedFormulaMode: false })).toMatchObject({
      simplifiedFormulaMode: false,
    })
    expect(loadFormulaStorage().savedFormulas[0].simplifiedFormulaMode).toBe(false)
  })

  it('keeps the draft in the collection before a shared formula replaces it', () => {
    saveDraft('x^2 + y^2')

    expect(preserveDraft('x^2', { simplifiedFormulaMode: true })).toMatchObject({
      name: 'x^2 + y^2',
      content: 'x^2 + y^2',
      simplifiedFormulaMode: true,
    })

    // Drafts that are already saved, unchanged, or empty are not added again.
    expect(preserveDraft('z')).toBeNull()
    saveDraft('z')
    expect(preserveDraft('z')).toBeNull()
    saveDraft('  ')
    expect(preserveDraft('z')).toBeNull()
    expect(loadFormulaStorage().savedFormulas).toHaveLength(1)
  })

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.fill(0)
        return bytes
      }),
    })

    const formula = addFormula('Fallback ID', '$ z $')

    expect(formula.id).toBe('00000000-0000-4000-8000-000000000000')
  })
})
