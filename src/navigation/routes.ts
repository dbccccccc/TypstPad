export type NavigablePage = 'editor' | 'guide' | 'about'
export type AppPage = NavigablePage | 'not-found'

export const APP_PAGE_PATHS: Record<NavigablePage, string> = {
  editor: '/',
  about: '/about',
  guide: '/guide',
}

export const PAGE_REDIRECTS: Record<string, string> = {
  '/guides/typst-to-png-svg': APP_PAGE_PATHS.guide,
  '/guides/image-to-typst': APP_PAGE_PATHS.guide,
}

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  const normalized = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return normalized === '' ? '/' : normalized
}

export function resolveAppPage(pathname: string): AppPage {
  const normalized = normalizePathname(pathname)

  for (const [page, path] of Object.entries(APP_PAGE_PATHS)) {
    if (normalized === path) return page as NavigablePage
  }

  return 'not-found'
}

export function resolvePageRedirect(pathname: string): string | undefined {
  return PAGE_REDIRECTS[normalizePathname(pathname)]
}
