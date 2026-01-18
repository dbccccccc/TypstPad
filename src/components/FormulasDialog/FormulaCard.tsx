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
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(formula.content)}>
          <h4 className="font-medium truncate">{formula.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">
            {formula.content}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDate(formula.createdAt)}
          </p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onLoad(formula.content)} title={t('formulas.action.load')}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRename} title={t('formulas.action.rename')}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete} title={t('formulas.action.delete')}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default memo(FormulaCard)
