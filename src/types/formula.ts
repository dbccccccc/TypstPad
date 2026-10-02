export interface SavedFormula {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
  /** The formula mode the content was written in; undefined for older entries. */
  simplifiedFormulaMode?: boolean
}

export interface FormulaStorage {
  currentDraft: string
  savedFormulas: SavedFormula[]
  version: number
}
