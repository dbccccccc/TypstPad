import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShareQuery, generateShareUrl, parseSharedFormula, takeSharedFormulaFromUrl } from './share'

function stubWindowLocation(url: string) {
  const parsed = new URL(url)
  const replaceState = vi.fn()
  vi.stubGlobal('window', {
    location: {
      href: parsed.href,
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
    },
    history: { state: { page: 'editor' }, replaceState },
  })
  return replaceState
}

describe('share URLs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips unicode formula content and its formula mode', () => {
    const code = '$ α + β = γ $'
    stubWindowLocation('https://typstpad.example/')

    const shareUrl = generateShareUrl(code, false)
    const parsed = new URL(shareUrl)

    expect(parsed.origin).toBe('https://typstpad.example')
    expect(parsed.pathname).toBe('/')
    expect(parsed.searchParams.get('formula')).toBeTruthy()
    expect(parseSharedFormula(parsed.search)).toEqual({ code, simplifiedFormulaMode: false })
    expect(parseSharedFormula(createShareQuery('x^2', true))).toEqual({ code: 'x^2', simplifiedFormulaMode: true })
  })

  it('returns null when the formula parameter is missing or invalid', () => {
    expect(parseSharedFormula('')).toBeNull()
    expect(parseSharedFormula('?formula=not-base64%21')).toBeNull()
  })

  it('leaves the mode unknown for links created before it was recorded', () => {
    expect(parseSharedFormula('?formula=eF4y')).toEqual({ code: 'x^2', simplifiedFormulaMode: undefined })
  })

  it('removes the shared formula from the address bar after reading it', () => {
    const replaceState = stubWindowLocation('https://typstpad.example/?formula=eF4y&mode=simplified&utm=x#top')

    expect(takeSharedFormulaFromUrl()).toEqual({ code: 'x^2', simplifiedFormulaMode: true })
    expect(replaceState).toHaveBeenCalledWith({ page: 'editor' }, '', '/?utm=x#top')
  })

  it('also removes an invalid formula parameter', () => {
    const replaceState = stubWindowLocation('https://typstpad.example/?formula=not-base64%21')

    expect(takeSharedFormulaFromUrl()).toBeNull()
    expect(replaceState).toHaveBeenCalledWith({ page: 'editor' }, '', '/')
  })

  it('does not touch the history without a formula parameter', () => {
    const replaceState = stubWindowLocation('https://typstpad.example/?utm=x')

    expect(takeSharedFormulaFromUrl()).toBeNull()
    expect(replaceState).not.toHaveBeenCalled()
  })
})
