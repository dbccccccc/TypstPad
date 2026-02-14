import { BookOpenText, Github, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

export default function AboutPage() {
  const { t } = useI18n()

  return (
    <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">{t('about.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('about.description')}</p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold">{t('about.mission.title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('about.mission.body')}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold">{t('about.features.title')}</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
              {t('about.features.item1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
              {t('about.features.item2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
              {t('about.features.item3')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
              {t('about.features.item4')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
              {t('about.features.item5')}
            </li>
          </ul>
        </section>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">{t('about.links.title')}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="https://github.com/dbccccccc/TypstPad" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Github className="h-4 w-4" />
                {t('about.links.github')}
              </Button>
            </a>
            <a href="https://github.com/dbccccccc/TypstPad/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t('about.links.license')}
              </Button>
            </a>
            <a href="https://typst.app/docs/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <BookOpenText className="h-4 w-4" />
                {t('about.links.typstDocs')}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
