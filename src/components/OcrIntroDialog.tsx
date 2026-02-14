import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Image, Loader2, LogIn, ScanText } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { OcrUsage } from '@/services/ocr'

interface OcrIntroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoosePhoto: () => void
  onLoginClick: () => void
  isAuthenticated: boolean
  usage?: OcrUsage | null
  maxUploadMb?: number
  loading?: boolean
}

function formatUploadSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '6'
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

function OcrIntroDialog({
  open,
  onOpenChange,
  onChoosePhoto,
  onLoginClick,
  isAuthenticated,
  usage,
  maxUploadMb = 6,
  loading = false,
}: OcrIntroDialogProps) {
  const { t, formatDate } = useI18n()
  const uploadLimitLabel = formatUploadSize(maxUploadMb)
  const hasUsage = Boolean(usage && usage.limit > 0)
  const remaining = usage ? Math.max(usage.limit - usage.count, 0) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ScanText className='h-5 w-5' />
            {t('ocr.intro.title')}
          </DialogTitle>
          <DialogDescription>{t('ocr.intro.description')}</DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
            {t('ocr.intro.fileSizeLimit', { maxMb: uploadLimitLabel })}
          </div>

          {hasUsage && usage && (
            <div className='rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1'>
              <p>{t('ocr.intro.limitInfo', { count: usage.count, limit: usage.limit })}</p>
              <p>{t('ocr.intro.remaining', { remaining })}</p>
              <p>{t('ocr.intro.resetsAt', { time: formatDate(usage.resetAt) })}</p>
            </div>
          )}
        </div>

        <div className='flex justify-end'>
          {isAuthenticated ? (
            <Button type='button' onClick={onChoosePhoto} disabled={loading} className='gap-2'>
              {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Image className='h-4 w-4' />}
              {t('ocr.intro.choosePhoto')}
            </Button>
          ) : (
            <Button type='button' onClick={onLoginClick} disabled={loading} className='gap-2'>
              {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <LogIn className='h-4 w-4' />}
              {t('ocr.intro.login')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OcrIntroDialog
