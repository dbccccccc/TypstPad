import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

interface NotFoundPageProps {
  onBackToEditor: () => void
}

export default function NotFoundPage({ onBackToEditor }: NotFoundPageProps) {
  const { t } = useI18n()

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex flex-col items-center text-center">
        <span className="text-[8rem] font-bold leading-none tracking-tighter text-foreground/10 sm:text-[12rem]">
          404
        </span>
        <h1 className="-mt-4 text-xl font-semibold sm:text-2xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('notFound.description')}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onBackToEditor}
          className="mt-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backToEditor')}
        </Button>
      </div>
    </main>
  )
}
