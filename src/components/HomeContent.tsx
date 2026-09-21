import { useI18n } from '../i18n'
import PageLink from '../navigation/PageLink'
import type { NavigablePage } from '../navigation/routes'
import { encodeBase64Utf8 } from '../utils/base64'

export const EXAMPLE_FORMULA = 'sum_(i=1)^n i = (n (n + 1)) / 2'
export const EXAMPLE_URL = `/?formula=${encodeURIComponent(encodeBase64Utf8(EXAMPLE_FORMULA))}`

export function EditorIntro() {
  const { t } = useI18n()
  return (
    <div className="mx-auto mb-4 max-w-6xl">
      <h1 className="text-base font-semibold sm:text-lg">{t('home.title')}</h1>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">{t('home.intro')}</p>
    </div>
  )
}

export default function HomeContent({ onNavigate }: { onNavigate?: (page: NavigablePage) => void }) {
  const { t } = useI18n()
  return (
    <section className="mx-auto mt-10 max-w-6xl border-t pt-6 pb-4" aria-labelledby="home-guides">
      <h2 id="home-guides" className="text-lg font-semibold">{t('home.guides')}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('home.guideIntro')}</p>
      <PageLink page="guide" onNavigate={onNavigate} className="mt-5 block rounded-lg border bg-card p-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h3 className="font-medium">{t('guides.title')}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('seo.guideDescription')}</p>
      </PageLink>
      <div className="mt-6 rounded-lg bg-muted/40 p-5">
        <h3 className="text-sm font-medium">{t('home.exampleTitle')}</h3>
        <pre className="my-3 overflow-x-auto text-sm"><code>{EXAMPLE_FORMULA}</code></pre>
        <p className="text-sm leading-6 text-muted-foreground">{t('home.exampleHelp')}</p>
        <a href={EXAMPLE_URL} className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4">{t('home.tryExample')}</a>
      </div>
      <PageLink page="about" onNavigate={onNavigate} className="mt-5 inline-block text-sm text-primary underline underline-offset-4">{t('app.titleAbout')}</PageLink>
    </section>
  )
}
