import { useEffect } from 'react'
import { useI18n } from '../i18n'
import type { AppPage } from '../navigation/routes'
import { getPageMetadata, getStructuredData, serializeJsonLd } from './metadata'

export function usePageMetadata(page: AppPage) {
  const { t } = useI18n()
  useEffect(() => {
    const metadata = getPageMetadata(page, t, __SITE_URL__, __SITE_INDEXABLE__)
    document.title = metadata.title

    const tags = [
      ['name', 'description', metadata.description],
      ['name', 'robots', metadata.robots],
      ['property', 'og:title', metadata.title],
      ['property', 'og:description', metadata.description],
      ['property', 'og:type', 'website'],
      ['property', 'og:site_name', 'TypstPad'],
      ['property', 'og:url', metadata.canonical],
      ['name', 'twitter:card', 'summary'],
      ['name', 'twitter:title', metadata.title],
      ['name', 'twitter:description', metadata.description],
    ] as const
    for (const [attribute, key, value] of tags) {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
      if (value === null) {
        element?.remove()
        continue
      }
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }
      element.content = value
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (metadata.canonical) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = metadata.canonical
    } else {
      canonical?.remove()
    }

    const data = getStructuredData(page, metadata)
    let structuredData = document.head.querySelector<HTMLScriptElement>('#page-structured-data')
    if (data) {
      if (!structuredData) {
        structuredData = document.createElement('script')
        structuredData.id = 'page-structured-data'
        structuredData.type = 'application/ld+json'
        document.head.appendChild(structuredData)
      }
      structuredData.textContent = serializeJsonLd(data)
    } else {
      structuredData?.remove()
    }
  }, [page, t])
}
