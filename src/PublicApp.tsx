import Header from './components/Header/Header'
import { EditorIntro } from './components/HomeContent'
import { useI18n } from './i18n'
import type { AppPage } from './navigation/routes'
import AboutPage from './pages/AboutPage'
import GuidePage from './pages/GuidePage'
import NotFoundPage from './pages/NotFoundPage'
import { usePageMetadata } from './seo/usePageMetadata'

// This shell is also rendered at build time. It must not import editor/WASM code.
export default function PublicApp({ page }: { page: AppPage }) {
  const { t } = useI18n()
  usePageMetadata(page)
  return (
    <div className="flex h-screen h-[100dvh] flex-col bg-background">
      <Header activePage={page} />
      {page === 'editor' ? (
        <main className="flex-1 min-h-0 overflow-auto p-3 sm:p-6">
          <EditorIntro />
          <p className="mx-auto max-w-6xl py-6 text-sm text-muted-foreground" role="status">{t('common.loading')}</p>
          <noscript><p className="mx-auto max-w-6xl text-sm">{t('home.requiresJs')}</p></noscript>
        </main>
      ) : page === 'about' ? (
        <AboutPage />
      ) : page === 'guide' ? (
        <GuidePage />
      ) : (
        <NotFoundPage />
      )}
    </div>
  )
}
