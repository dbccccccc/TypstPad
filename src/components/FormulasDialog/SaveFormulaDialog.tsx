import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'

interface SaveFormulaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveLocal: (name: string) => void
  onSaveAccount?: (name: string) => Promise<void> | void
  onLoginClick?: () => void
  isAuthenticated?: boolean
  accountSaving?: boolean
  accountSaveEnabled?: boolean
  content: string
}

function SaveFormulaDialog({
  open,
  onOpenChange,
  onSaveLocal,
  onSaveAccount,
  onLoginClick,
  isAuthenticated = false,
  accountSaving = false,
  accountSaveEnabled = true,
  content,
}: SaveFormulaDialogProps) {
  const [name, setName] = useState('')
  const [saveTarget, setSaveTarget] = useState<'local' | 'account'>('local')
  const { t } = useI18n()
  const trimmedContent = content.trim()
  const hasContent = trimmedContent.length > 0
  const autoName = (() => {
    const normalized = trimmedContent.replace(/\s+/g, ' ')
    if (normalized.length === 0) return t('formulas.untitled')
    return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized
  })()

  useEffect(() => {
    if (!open) {
      setName('')
      setSaveTarget('local')
    }
  }, [open])

  const handleSave = async () => {
    if (!hasContent) return
    const resolvedName = name.trim() || autoName

    if (saveTarget === 'account') {
      if (!accountSaveEnabled) return
      if (!isAuthenticated || !onSaveAccount) return
      try {
        await onSaveAccount(resolvedName)
      } catch {
        return
      }
    } else {
      onSaveLocal(resolvedName)
    }

    setName('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName('')
    onOpenChange(false)
  }

  const handleTargetChange = (target: 'local' | 'account') => {
    if (target === 'account' && !accountSaveEnabled) return
    setSaveTarget(target)
  }

  const accountSelected = saveTarget === 'account'
  const loginRequired = accountSelected && !isAuthenticated
  const saveDisabled = !hasContent || (accountSelected && accountSaving) || loginRequired

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

        <div className="space-y-2">
          <Label>{t('saveFormula.locationLabel')}</Label>
          <div className="inline-flex rounded-md border bg-muted/50 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleTargetChange('local')}
              className={cn(
                'rounded-sm px-3 py-1 transition-colors',
                saveTarget === 'local'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('saveFormula.location.local')}
            </button>
            <button
              type="button"
              onClick={() => handleTargetChange('account')}
              disabled={!accountSaveEnabled}
              className={cn(
                'rounded-sm px-3 py-1 transition-colors',
                saveTarget === 'account'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                !accountSaveEnabled && 'cursor-not-allowed opacity-60 hover:text-muted-foreground'
              )}
            >
              {t('saveFormula.location.account')}
            </button>
          </div>
          {!accountSaveEnabled ? (
            <p className="text-xs text-muted-foreground">
              {t('saveFormula.accountComingSoon')}
            </p>
          ) : accountSelected && (
            <p className="text-xs text-muted-foreground">
              {isAuthenticated ? t('saveFormula.accountHint') : t('saveFormula.loginToSave')}
            </p>
          )}
          {accountSaveEnabled && loginRequired && onLoginClick && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={onLoginClick}
            >
              {t('header.login')}
            </Button>
          )}
        </div>

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
          <Button onClick={handleSave} disabled={saveDisabled}>
            {accountSelected ? t('saveFormula.saveAccount') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveFormulaDialog
