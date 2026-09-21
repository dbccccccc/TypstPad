import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from '../contexts/ThemeContext'
import { I18nProvider, useI18n } from '../i18n'
import { APP_PAGE_PATHS, PAGE_REDIRECTS, type AppPage } from '../navigation/routes'
import PublicApp from '../PublicApp'
import { getPageMetadata, getStructuredData, serializeJsonLd } from './metadata'

export const pages = APP_PAGE_PATHS
export const redirects = PAGE_REDIRECTS
export const siteUrl = __SITE_URL__
export const indexable = __SITE_INDEXABLE__

// Static hosts without HTTP redirect rules still move visitors to the Guide.
export function renderRedirect(destination: string) {
  return '<!doctype html>' + renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Guide - TypstPad</title>
        <meta httpEquiv="refresh" content={`0; url=${destination}`} />
        {!indexable && <meta name="robots" content="noindex, follow" />}
        {siteUrl && <link rel="canonical" href={siteUrl + destination} />}
      </head>
      <body><p>This content is now in the <a href={destination}>Guide</a>.</p></body>
    </html>,
  )
}

function PageHead({ page }: { page: AppPage }) {
  const { t } = useI18n()
  const metadata = getPageMetadata(page, t, siteUrl, indexable)
  const data = getStructuredData(page, metadata)
  return (
    <>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="robots" content={metadata.robots} />
      {metadata.canonical && <link rel="canonical" href={metadata.canonical} />}
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="TypstPad" />
      {metadata.canonical && <meta property="og:url" content={metadata.canonical} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={metadata.title} />
      <meta name="twitter:description" content={metadata.description} />
      {data && <script id="page-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />}
    </>
  )
}

export function renderPage(page: AppPage) {
  return {
    head: renderToStaticMarkup(<I18nProvider><PageHead page={page} /></I18nProvider>),
    body: renderToStaticMarkup(
      <I18nProvider><ThemeProvider><PublicApp page={page} /></ThemeProvider></I18nProvider>,
    ),
  }
}
