import { Button } from '../components/ui/button'
import { EXAMPLE_FORMULA, EXAMPLE_URL } from '../components/HomeContent'
import { useI18n } from '../i18n'
import PageLink from '../navigation/PageLink'
import type { NavigablePage } from '../navigation/routes'

export default function GuidePage({ onNavigate }: { onNavigate?: (page: NavigablePage) => void }) {
  const { t } = useI18n()
  const headingClass = 'mb-3 text-xl font-semibold tracking-tight'
  const subheadingClass = 'mb-3 text-base font-semibold'
  const textClass = 'text-sm leading-7 text-muted-foreground'
  const sections = [
    { id: 'export', label: 'guides.export.title' },
    { id: 'image-to-typst', label: 'guides.image.title' },
    { id: 'saving-and-sharing', label: 'guides.saving.title' },
  ]

  return (
    <main className="flex-1 min-h-0 overflow-auto">
      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">TypstPad</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('guides.title')}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{t('guides.intro')}</p>
          <Button asChild className="mt-6">
            <PageLink page="editor" onNavigate={onNavigate}>{t('guides.openEditor')}</PageLink>
          </Button>
        </header>

        <nav aria-label={t('guides.contents')} className="mt-8 rounded-xl border bg-muted/30 p-5">
          <p className="mb-3 text-sm font-semibold">{t('guides.contents')}</p>
          <ul className="space-y-3 text-sm">
            {sections.map(({ id, label }) => (
              <li key={id}><a href={`#${id}`} className="text-primary underline underline-offset-4">{t(label)}</a></li>
            ))}
          </ul>
        </nav>

        <section id="export" aria-labelledby="export-title" className="mt-10 scroll-mt-6 border-t pt-8">
          <h2 id="export-title" className={headingClass}>{t('guides.export.title')}</h2>
          <p className={textClass}>{t('guides.export.intro')}</p>
          <h3 className={`${subheadingClass} mt-6`}>{t('guides.export.stepsTitle')}</h3>
          <ol className="list-decimal space-y-4 pl-5">
            {[1, 2, 3, 4].map((step) => <li key={step} className={`${textClass} pl-2`}>{t(`guides.export.step${step}`)}</li>)}
          </ol>

          <div className="mt-7 rounded-xl border bg-muted/30 p-5 sm:p-6">
            <h3 className={subheadingClass}>{t('guides.export.exampleTitle')}</h3>
            <pre className="my-4 overflow-x-auto rounded-md bg-background p-4 text-sm"><code>{EXAMPLE_FORMULA}</code></pre>
            <p className={textClass}>{t('guides.export.exampleHelp')}</p>
            <a href={EXAMPLE_URL} className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">{t('home.tryExample')}</a>
          </div>
          <h3 className={`${subheadingClass} mt-8`}>{t('guides.export.formatsTitle')}</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            {(['png', 'svg'] as const).map((format) => (
              <div key={format} className="rounded-lg border p-5">
                <dt className="mb-2 font-medium">{format.toUpperCase()}</dt>
                <dd className={textClass}>{t(`guides.export.${format}`)}</dd>
              </div>
            ))}
          </dl>
          <p className={`${textClass} mt-4`}>{t('guides.export.otherFormats')}</p>
          <h3 className={`${subheadingClass} mt-8`}>{t('guides.export.troubleshootingTitle')}</h3>
          <p className={textClass}>{t('guides.export.troubleshooting')}</p>
        </section>

        <section id="image-to-typst" aria-labelledby="image-title" className="mt-10 scroll-mt-6 border-t pt-8">
          <h2 id="image-title" className={headingClass}>{t('guides.image.title')}</h2>
          <p className={textClass}>{t('guides.image.intro')}</p>
          <h3 className={`${subheadingClass} mt-6`}>{t('guides.image.stepsTitle')}</h3>
          <ol className="list-decimal space-y-4 pl-5">
            {[1, 2, 3, 4].map((step) => <li key={step} className={`${textClass} pl-2`}>{t(`guides.image.step${step}`)}</li>)}
          </ol>
          {(['preparation', 'local', 'review'] as const).map((section) => (
            <div key={section} className="mt-8">
              <h3 className={subheadingClass}>{t(`guides.image.${section}Title`)}</h3>
              <p className={textClass}>{t(`guides.image.${section}`)}</p>
            </div>
          ))}
          <a href="https://huggingface.co/dbcccc/TypLens" className="mt-4 inline-block text-sm text-primary underline underline-offset-4">{t('guides.image.modelLink')}</a>
        </section>

        <section id="saving-and-sharing" aria-labelledby="saving-title" className="mt-10 scroll-mt-6 border-t pt-8">
          <h2 id="saving-title" className={headingClass}>{t('guides.saving.title')}</h2>
          <p className={textClass}>{t('guides.saving.local')}</p>
          <p className={`${textClass} mt-4`}>{t('guides.saving.sharing')}</p>
        </section>

        <footer className="mt-10 border-t pt-6">
          <h2 className="mb-3 text-sm font-medium">{t('guides.related')}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-primary underline underline-offset-4">
            <PageLink page="about" onNavigate={onNavigate}>{t('app.titleAbout')}</PageLink>
            <a href="https://typst.app/docs/">{t('about.links.typstDocs')}</a>
          </div>
        </footer>
      </article>
    </main>
  )
}
