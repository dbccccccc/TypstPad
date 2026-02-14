export type NavigablePage = 'editor' | 'docs' | 'about'
export type AppPage = NavigablePage | 'not-found'

export const APP_PAGE_PATHS: Record<NavigablePage, string> = {
  editor: '/',
  docs: '/docs',
  about: '/about',
}

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '' ? '/' : normalized
}

export function resolveAppPage(pathname: string): AppPage {
  const normalized = normalizePathname(pathname)

  if (normalized === '/' || normalized === '/index.html') {
    return 'editor'
  }

  if (normalized === '/docs') {
    return 'docs'
  }

  if (normalized === '/about') {
    return 'about'
  }

  return 'not-found'
}
