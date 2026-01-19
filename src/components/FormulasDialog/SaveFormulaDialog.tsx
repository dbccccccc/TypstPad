import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Bookmark } from 'lucide-react'
import { useI18n } from '@/i18n'

interface SaveFormulaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
  content: string
}

function SaveFormulaDialog({ open, onOpenChange, onSave, content }: SaveFormulaDialogProps) {
  const [name, setName] = useState('')
  const { t } = useI18n()
  const trimmedContent = content.trim()
  const hasContent = trimmedContent.length > 0
  const autoName = (() => {
    const normalized = trimmedContent.replace(/\s+/g, ' ')
    if (normalized.length === 0) return t('formulas.untitled')
    return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized
  })()

  const handleSave = () => {
    if (!hasContent) return
    onSave(name.trim())
    setName('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {t('saveFormula.title')}
          </DialogTitle>
          <DialogDescription>
            {t('saveFormula.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="save-formula-name">{t('saveFormula.nameLabel')}</Label>
              <input
                id="save-formula-name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('saveFormula.placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
              />
            </div>
            {!name.trim() && (
              <p className="text-xs text-muted-foreground">
                {t('saveFormula.autoName', { name: autoName })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('saveFormula.previewLabel')}</Label>
            <div className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-2 text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {hasContent ? (
                trimmedContent
              ) : (
                <span className="text-muted-foreground">{t('saveFormula.previewEmpty')}</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!hasContent}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveFormulaDialog
