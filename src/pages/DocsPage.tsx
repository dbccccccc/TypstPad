import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

export default function DocsPage() {
  const { t } = useI18n()

  return (
    <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">{t('docs.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('docs.description')}</p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold">{t('docs.quickStart.title')}</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                1
              </span>
              {t('docs.quickStart.step1')}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                2
              </span>
              {t('docs.quickStart.step2')}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                3
              </span>
              {t('docs.quickStart.step3')}
            </li>
          </ol>
        </section>

        <div className="border-t pt-6">
          <a href="https://typst.app/docs/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              {t('docs.link.typst')}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </main>
  )
}
