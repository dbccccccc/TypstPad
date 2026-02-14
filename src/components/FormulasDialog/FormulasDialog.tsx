import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Bookmark, Loader2, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FormulaCard from './FormulaCard'
import { loadFormulaStorage, deleteFormula, updateFormula, clearAllFormulas } from '../../utils/storage'
import type { SavedFormula } from '../../types/formula'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { deleteAccountSave, listAccountSaves, updateAccountSave } from '@/services/accountSaves'
import type { OcrUser } from '@/services/ocr'

interface FormulasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadFormula: (content: string) => void
  user?: OcrUser | null
  onLoginClick?: () => void
  accountEnabled?: boolean
}

function FormulasDialog({
  open,
  onOpenChange,
  onLoadFormula,
  user,
  onLoginClick,
  accountEnabled = true,
}: FormulasDialogProps) {
  const [formulas, setFormulas] = useState<SavedFormula[]>([])
  const [accountFormulas, setAccountFormulas] = useState<SavedFormula[]>([])
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState<'unauthenticated' | 'failed' | null>(null)
  const [activeTab, setActiveTab] = useState<'local' | 'account'>('local')
  const { t } = useI18n()

  const refreshFormulas = useCallback(() => {
    setFormulas(loadFormulaStorage().savedFormulas)
  }, [])

  const refreshAccountFormulas = useCallback(async () => {
    if (!accountEnabled) {
      setAccountFormulas([])
      setAccountError(null)
      setAccountLoading(false)
      return
    }

    if (!user) {
      setAccountFormulas([])
      setAccountError('unauthenticated')
      return
    }

    setAccountLoading(true)
    setAccountError(null)

    try {
      const items = await listAccountSaves()
      setAccountFormulas(items)
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 401) {
        setAccountError('unauthenticated')
      } else {
        setAccountError('failed')
      }
    } finally {
      setAccountLoading(false)
    }
  }, [accountEnabled, user])

  useEffect(() => {
    if (!accountEnabled && activeTab === 'account') {
      setActiveTab('local')
    }
  }, [accountEnabled, activeTab])

  useEffect(() => {
    if (open) {
      if (activeTab === 'local') {
        refreshFormulas()
      } else {
        void refreshAccountFormulas()
      }
    }
  }, [open, activeTab, refreshFormulas, refreshAccountFormulas])

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

  const handleAccountDelete = useCallback((id: string) => {
    deleteAccountSave(id)
      .then(() => {
        setAccountFormulas((prev) => prev.filter((formula) => formula.id !== id))
      })
      .catch((error) => {
        console.error('Failed to delete account save:', error)
        alert(t('formulas.account.error.deleteFailed'))
      })
  }, [t])

  const handleAccountRename = useCallback((id: string, newName: string) => {
    updateAccountSave(id, { name: newName })
      .then((updated) => {
        setAccountFormulas((prev) => prev.map((formula) => (
          formula.id === id ? updated : formula
        )))
      })
      .catch((error) => {
        console.error('Failed to update account save:', error)
        alert(t('formulas.account.error.updateFailed'))
      })
  }, [t])

  const handleClearAll = useCallback(() => {
    if (confirm(t('formulas.clearAllConfirm'))) {
      clearAllFormulas()
      refreshFormulas()
    }
  }, [refreshFormulas, t])

  const handleTabChange = useCallback((nextTab: 'local' | 'account') => {
    if (nextTab === 'account' && !accountEnabled) return
    setActiveTab(nextTab)
  }, [accountEnabled])

  const showAccountLogin = activeTab === 'account' && (!user || accountError === 'unauthenticated')
  const showAccountError = activeTab === 'account' && accountError === 'failed'
  const visibleFormulas = activeTab === 'local' ? formulas : accountFormulas

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              {t('formulas.title')}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border bg-muted/50 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleTabChange('local')}
                  className={cn(
                    'rounded-sm px-3 py-1 transition-colors',
                    activeTab === 'local'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('formulas.tabs.local')}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('account')}
                  disabled={!accountEnabled}
                  className={cn(
                    'rounded-sm px-3 py-1 transition-colors',
                    activeTab === 'account'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    !accountEnabled && 'cursor-not-allowed opacity-60 hover:text-muted-foreground'
                  )}
                >
                  {t('formulas.tabs.account')}
                </button>
              </div>
              {activeTab === 'local' && formulas.length > 0 && (
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
              {activeTab === 'account' && accountLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('common.loading')}
                </div>
              )}
              {!accountEnabled && (
                <div className="text-xs text-muted-foreground">{t('common.comingSoon')}</div>
              )}
            </div>
          </div>
        </DialogHeader>

        {showAccountLogin ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('formulas.account.loginTitle')}</p>
            <p className="text-sm mt-1">
              {t('formulas.account.loginHint')}
            </p>
            {onLoginClick && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onLoginClick}
              >
                {t('header.login')}
              </Button>
            )}
          </div>
        ) : showAccountError ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('formulas.account.error.loadFailed')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void refreshAccountFormulas()}
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : visibleFormulas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
            {activeTab === 'local' ? (
              <>
                <p>{t('formulas.emptyTitle')}</p>
                <p className="text-sm mt-1">
                  {t('formulas.emptyHint', { save: t('common.save'), input: t('common.input') })}
                </p>
              </>
            ) : (
              <>
                <p>{t('formulas.account.emptyTitle')}</p>
                <p className="text-sm mt-1">
                  {t('formulas.account.emptyHint')}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-2">
            {visibleFormulas.map(formula => (
              <FormulaCard
                key={formula.id}
                formula={formula}
                onLoad={handleLoad}
                onDelete={activeTab === 'local' ? handleDelete : handleAccountDelete}
                onRename={activeTab === 'local' ? handleRename : handleAccountRename}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default FormulasDialog
