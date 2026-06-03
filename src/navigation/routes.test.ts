import { describe, expect, it } from 'vitest'
import { APP_PAGE_PATHS, resolveAppPage } from './routes'

describe('app routes', () => {
  it('resolves known editor routes', () => {
    expect(resolveAppPage('/')).toBe('editor')
    expect(resolveAppPage('/index.html')).toBe('editor')
    expect(APP_PAGE_PATHS.editor).toBe('/')
  })

  it('normalizes trailing slashes for navigable pages', () => {
    expect(resolveAppPage('/docs/')).toBe('docs')
    expect(resolveAppPage('/about/')).toBe('about')
  })

  it('returns not-found for unknown routes', () => {
    expect(resolveAppPage('/missing')).toBe('not-found')
    expect(resolveAppPage('/formula/123')).toBe('not-found')
  })
})
