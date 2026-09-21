import { describe, expect, it } from 'vitest'
import { APP_PAGE_PATHS, resolveAppPage, resolvePageRedirect } from './routes'

describe('app routes', () => {
  it('resolves known editor routes', () => {
    expect(resolveAppPage('/')).toBe('editor')
    expect(resolveAppPage('/index.html')).toBe('editor')
    expect(APP_PAGE_PATHS.editor).toBe('/')
  })

  it('normalizes trailing slashes for navigable pages', () => {
    expect(resolveAppPage('/about/')).toBe('about')
    expect(resolveAppPage('/about/index.html')).toBe('about')
    expect(resolveAppPage('/guide')).toBe('guide')
    expect(resolveAppPage('/guide/')).toBe('guide')
    expect(resolveAppPage('/guide/index.html')).toBe('guide')
  })

  it('redirects retired guides without treating them as public pages', () => {
    for (const path of ['/guides/typst-to-png-svg', '/guides/image-to-typst']) {
      for (const suffix of ['', '/', '/index.html']) {
        expect(resolvePageRedirect(path + suffix)).toBe('/guide')
        expect(resolveAppPage(path + suffix)).toBe('not-found')
      }
    }
    expect(resolvePageRedirect('/guide')).toBeUndefined()
    expect(resolvePageRedirect('/guides/missing')).toBeUndefined()
    expect(resolvePageRedirect('/guides/image-to-typst/extra')).toBeUndefined()
  })

  it('returns not-found for unknown routes', () => {
    expect(resolveAppPage('/missing')).toBe('not-found')
    expect(resolveAppPage('/formula/123')).toBe('not-found')
    expect(resolveAppPage('/guides/missing')).toBe('not-found')
    expect(resolveAppPage('/about-us')).toBe('not-found')
  })
})
