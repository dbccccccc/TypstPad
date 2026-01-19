import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Edit3, Download } from 'lucide-react'
import type { SavedFormula } from '../../types/formula'
import { useI18n } from '@/i18n'

interface FormulaCardProps {
  formula: SavedFormula
  onLoad: (content: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newName: string) => void
}

function FormulaCard({ formula, onLoad, onDelete, onRename }: FormulaCardProps) {
  const { t, formatDate } = useI18n()

  const handleRename = () => {
    const newName = prompt(t('formulas.renamePrompt'), formula.name)
    if (newName && newName !== formula.name) {
      onRename(formula.id, newName)
    }
  }

  const handleDelete = () => {
    if (confirm(t('formulas.deleteConfirm', { name: formula.name }))) {
      onDelete(formula.id)
    }
  }

  return (
    <div className="group rounded-lg border bg-card p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => onLoad(formula.content)}
        >
          <h4 className="font-medium truncate">{formula.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(formula.createdAt)}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => onLoad(formula.content)}
          >
            <Download className="h-3.5 w-3.5" />
            {t('formulas.action.load')}
          </Button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRename}
              title={t('formulas.action.rename')}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
              title={t('formulas.action.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 font-mono">
        {formula.content}
      </p>
    </div>
  )
}

export default memo(FormulaCard)
