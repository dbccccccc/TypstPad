export interface SavedFormula {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface FormulaStorage {
  currentDraft: string
  savedFormulas: SavedFormula[]
  version: number
}
