import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FormulaCard from './FormulaCard'
import { loadFormulaStorage, deleteFormula, updateFormula, clearAllFormulas } from '../../utils/storage'
import type { SavedFormula } from '../../types/formula'
import { useI18n } from '@/i18n'

interface FormulasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadFormula: (content: string) => void
}

function FormulasDialog({ open, onOpenChange, onLoadFormula }: FormulasDialogProps) {
  const [formulas, setFormulas] = useState<SavedFormula[]>([])
  const { t } = useI18n()

  const refreshFormulas = useCallback(() => {
    setFormulas(loadFormulaStorage().savedFormulas)
  }, [])

  useEffect(() => {
    if (open) {
      refreshFormulas()
    }
  }, [open, refreshFormulas])

  const handleLoad = useCallback((content: string) => {
    onLoadFormula(content)
    onOpenChange(false)
  }, [onLoadFormula, onOpenChange])

  const handleDelete = useCallback((id: string) => {
    deleteFormula(id)
    refreshFormulas()
  }, [refreshFormulas])

  const handleRename = useCallback((id: string, newName: string) => {
    updateFormula(id, { name: newName })
    refreshFormulas()
  }, [refreshFormulas])

  const handleClearAll = useCallback(() => {
    if (confirm(t('formulas.clearAllConfirm'))) {
      clearAllFormulas()
      refreshFormulas()
    }
  }, [refreshFormulas, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              {t('formulas.title')}
            </span>
            {formulas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive hover:text-destructive h-7 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('formulas.clearAll')}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {formulas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('formulas.emptyTitle')}</p>
            <p className="text-sm mt-1">
              {t('formulas.emptyHint', { save: t('common.save'), input: t('common.input') })}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {formulas.map(formula => (
              <FormulaCard
                key={formula.id}
                formula={formula}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default FormulasDialog
