import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, Download, FolderHeart, ScanText } from 'lucide-react'
import { Button } from '../components/ui/button'
import { EXAMPLE_FORMULA, EXAMPLE_URL } from '../components/HomeContent'
import { useI18n } from '../i18n'
import PageLink from '../navigation/PageLink'
import type { NavigablePage } from '../navigation/routes'

const topics = [
  { id: 'export', label: 'guides.topics.export', icon: Download },
  { id: 'image-to-typst', label: 'guides.topics.image', icon: ScanText },
  { id: 'saving-and-sharing', label: 'guides.topics.saving', icon: FolderHeart },
] as const

type GuideTopic = (typeof topics)[number]['id']

function topicFromLocation(): GuideTopic {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
  return topics.find(({ id }) => id === hash)?.id ?? 'export'
}

function GuideDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="pb-5 text-sm leading-6 text-muted-foreground">{children}</div>
    </details>
  )
}

function GuideSteps({ topic }: { topic: 'export' | 'image' | 'saving' }) {
  const { t } = useI18n()
  return (
    <ol className="my-6 space-y-5">
      {[1, 2, 3].map((step) => (
        <li key={step} className="flex gap-3 sm:gap-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground" aria-hidden="true">{step}</span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold">{t(`guides.${topic}.step${step}Title`)}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`guides.${topic}.step${step}`)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function GuidePage({ onNavigate }: { onNavigate?: (page: NavigablePage) => void }) {
  const { t } = useI18n()
  const [activeTopic, setActiveTopic] = useState<GuideTopic>(topicFromLocation)

  useEffect(() => {
    const syncTopic = () => setActiveTopic(topicFromLocation())
    window.addEventListener('hashchange', syncTopic)
    window.addEventListener('popstate', syncTopic)
    return () => {
      window.removeEventListener('hashchange', syncTopic)
      window.removeEventListener('popstate', syncTopic)
    }
  }, [])

  function selectTopic(event: MouseEvent<HTMLAnchorElement>, topic: GuideTopic) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (topic === activeTopic) return
    setActiveTopic(topic)
    window.history.pushState(window.history.state, '', `#${topic}`)
  }

  const sectionClass = (topic: GuideTopic) => `guide-topic scroll-mt-6 rounded-xl border bg-card px-5 pt-5 pb-1 sm:px-7 sm:pt-7 ${activeTopic === topic ? '' : 'hidden'}`
  const headingClass = 'text-xl font-semibold tracking-tight'
  const textClass = 'mt-2 text-sm leading-6 text-muted-foreground'

  return (
    <main className="flex-1 min-h-0 overflow-auto">
      <article className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">{t('guides.title')}</h1>
            <Button asChild size="sm" variant="outline">
              <PageLink page="editor" onNavigate={onNavigate} className="gap-2">
                {t('guides.openEditor')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PageLink>
            </Button>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('guides.intro')}</p>
        </header>

        <nav aria-label={t('guides.contents')} className="my-6">
          <ul className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
            {topics.map(({ id, label, icon: Icon }) => (
              <li key={id} className="min-w-0">
                <a
                  href={`#${id}`}
                  onClick={(event) => selectTopic(event, id)}
                  aria-current={activeTopic === id ? 'location' : undefined}
                  className={`flex h-full items-center justify-center gap-2 rounded-md px-2 py-2.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
                    activeTopic === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  }`}
                >
                  <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
                  {t(label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <noscript><style>{'.guide-topic.hidden { display: block; margin-top: 1.5rem; }'}</style></noscript>

        <section id="export" aria-labelledby="export-title" className={sectionClass('export')}>
          <h2 id="export-title" className={headingClass}>{t('guides.export.title')}</h2>
          <p className={textClass}>{t('guides.export.intro')}</p>
          <GuideSteps topic="export" />

          <GuideDetails title={t('guides.export.formatsTitle')}>
            <dl className="space-y-3">
              {(['png', 'svg', 'jpg', 'html', 'typst'] as const).map((format) => (
                <div key={format} className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <dt className="font-medium text-foreground">{format === 'typst' ? '.typ' : format.toUpperCase()}</dt>
                  <dd>{t(`guides.export.${format}`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5">{t('guides.export.clipboardHelp')}</p>
          </GuideDetails>
          <GuideDetails title={t('guides.export.exampleTitle')}>
            <pre className="mb-3 overflow-x-auto rounded-md bg-muted/50 p-3 text-sm text-foreground"><code>{EXAMPLE_FORMULA}</code></pre>
            <p>{t('guides.export.exampleHelp')}</p>
            <a href={EXAMPLE_URL} className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">{t('home.tryExample')}</a>
          </GuideDetails>
          <GuideDetails title={t('guides.export.troubleshootingTitle')}>
            <p>{t('guides.export.troubleshooting')}</p>
          </GuideDetails>
        </section>

        <section id="image-to-typst" aria-labelledby="image-title" className={sectionClass('image-to-typst')}>
          <h2 id="image-title" className={headingClass}>{t('guides.image.title')}</h2>
          <p className={textClass}>{t('guides.image.intro')}</p>
          <GuideSteps topic="image" />
          {(['preparation', 'local', 'review'] as const).map((section) => (
            <GuideDetails key={section} title={t(`guides.image.${section}Title`)}>
              <p>{t(`guides.image.${section}`)}</p>
              {section === 'local' && (
                <a href="https://huggingface.co/dbcccc/TypLens" className="mt-3 inline-block text-primary underline underline-offset-4">{t('guides.image.modelLink')}</a>
              )}
            </GuideDetails>
          ))}
        </section>

        <section id="saving-and-sharing" aria-labelledby="saving-title" className={sectionClass('saving-and-sharing')}>
          <h2 id="saving-title" className={headingClass}>{t('guides.saving.title')}</h2>
          <p className={textClass}>{t('guides.saving.intro')}</p>
          <GuideSteps topic="saving" />
          <GuideDetails title={t('guides.saving.localTitle')}>
            <p>{t('guides.saving.local')}</p>
          </GuideDetails>
          <GuideDetails title={t('guides.saving.sharingTitle')}>
            <p>{t('guides.saving.sharing')}</p>
          </GuideDetails>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs">
          <p className="text-muted-foreground">{t('guides.related')}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-primary underline underline-offset-4">
            <PageLink page="about" onNavigate={onNavigate}>{t('app.titleAbout')}</PageLink>
            <a href="https://typst.app/docs/">{t('about.links.typstDocs')}</a>
          </div>
        </footer>
      </article>
    </main>
  )
}
