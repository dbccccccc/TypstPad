import {
  ArrowRight, ArrowUpRight, BookOpenText,
  Github, HardDrive, ScanText, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import PageLink from '@/navigation/PageLink'
import type { NavigablePage } from '@/navigation/routes'

declare const __APP_VERSION__: string

const resources = [
  { id: 'github', icon: Github, href: 'https://github.com/dbccccccc/TypstPad' },
  { id: 'license', icon: ShieldCheck, href: 'https://github.com/dbccccccc/TypstPad/blob/main/LICENSE' },
  { id: 'typstDocs', icon: BookOpenText, href: 'https://typst.app/docs/' },
  { id: 'im2typstModel', icon: ScanText, href: 'https://huggingface.co/dbcccc/TypLens' },
  { id: 'im2typstSource', icon: Github, href: 'https://github.com/dbccccccc/TypLens' },
] as const

export default function AboutPage({ onNavigate }: {
  onNavigate?: (page: NavigablePage) => void
}) {
  const { t } = useI18n()

  return (
    <main className="flex-1 min-h-0 overflow-auto">
      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t('about.eyebrow')}</p>
            <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">v{__APP_VERSION__}</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t('about.title')}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{t('about.description')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <PageLink page="editor" onNavigate={onNavigate}>
                {t('about.openEditor')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PageLink>
            </Button>
            <Button asChild variant="outline">
              <PageLink page="guide" onNavigate={onNavigate}>{t('about.readGuide')}</PageLink>
            </Button>
          </div>
        </header>

        <section className="mt-10 border-t pt-8" aria-labelledby="about-purpose">
          <h2 id="about-purpose" className="text-xl font-semibold tracking-tight">{t('about.mission.title')}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t('about.mission.body')}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t('about.mission.workflow')}</p>
        </section>

        <section className="mt-12 rounded-2xl border bg-muted/30 p-5 sm:p-7" aria-labelledby="about-storage">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="about-storage" className="text-lg font-semibold tracking-tight">{t('about.storage.title')}</h2>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">{t('about.storage.localTitle')}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{t('about.storage.localBody')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">{t('about.storage.processingTitle')}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{t('about.storage.processingBody')}</p>
            </div>
          </div>
          <p className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">{t('about.storage.network')}</p>
        </section>

        <section className="mt-12" aria-labelledby="about-open-source">
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="about-open-source" className="text-xl font-semibold tracking-tight">{t('about.openSource.title')}</h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{t('about.openSource.body')}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{t('about.openSource.contribute')}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {resources.map(({ id, icon: Icon, href }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium">{t('about.links.' + id)}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
        <footer className="mt-10 border-t pt-5 text-xs leading-6 text-muted-foreground">
          {t('about.footer')}
        </footer>
      </article>
    </main>
  )
}
