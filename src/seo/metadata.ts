import { APP_PAGE_PATHS, type AppPage } from '../navigation/routes'

export function normalizeSiteUrl(value: string): string {
  if (!value.trim()) return ''
  const url = new URL(value.trim())
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an http(s) origin, such as https://typstpad.com, without a path, credentials, query, or fragment.')
  }
  return url.origin
}

export function parseIndexable(value: string | undefined): boolean {
  if (value === undefined || value === '' || value === 'true') return true
  if (value === 'false') return false
  throw new Error('SITE_INDEXABLE must be true or false.')
}

const pageKeys: Record<AppPage, { title: string; description: string }> = {
  editor: { title: 'app.title', description: 'seo.homeDescription' },
  about: { title: 'app.titleAbout', description: 'seo.aboutDescription' },
  guide: { title: 'seo.guideTitle', description: 'seo.guideDescription' },
  'not-found': { title: 'app.titleNotFound', description: 'notFound.description' },
}

export function getPageMetadata(
  page: AppPage,
  t: (key: string) => string,
  siteUrl: string,
  indexable = true,
) {
  const keys = pageKeys[page]
  const canonical = siteUrl && page !== 'not-found' ? `${normalizeSiteUrl(siteUrl)}${APP_PAGE_PATHS[page]}` : null
  return {
    title: t(keys.title),
    description: t(keys.description),
    canonical,
    robots: indexable && page !== 'not-found' ? 'index, follow' : 'noindex, follow',
  }
}

export function getStructuredData(page: AppPage, metadata: ReturnType<typeof getPageMetadata>) {
  if (!metadata.canonical || metadata.robots.startsWith('noindex')) return null
  return {
    '@context': 'https://schema.org',
    '@type': page === 'editor' ? 'WebApplication' : 'WebPage',
    name: page === 'editor' ? 'TypstPad' : metadata.title,
    url: metadata.canonical,
    description: metadata.description,
    ...(page === 'editor' ? { applicationCategory: 'EducationalApplication', operatingSystem: 'Web' } : {}),
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
