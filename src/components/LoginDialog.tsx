import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Github, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { OcrProvider } from '@/services/ocr'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (provider: OcrProvider) => void
  loading?: boolean
}

function LoginDialog({ open, onOpenChange, onLogin, loading = false }: LoginDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('auth.login.title')}</DialogTitle>
          <DialogDescription>{t('auth.login.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => onLogin('github')}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            {t('auth.login.github')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LoginDialog
