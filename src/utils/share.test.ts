import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateShareUrl, getFormulaFromUrl } from './share'

function stubWindowLocation(url: string) {
  const parsed = new URL(url)
  vi.stubGlobal('window', {
    location: {
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
    },
  })
}

describe('share URLs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips unicode formula content through the formula query parameter', () => {
    const code = '$ α + β = γ $'
    stubWindowLocation('https://typstpad.example/')

    const shareUrl = generateShareUrl(code)
    const parsed = new URL(shareUrl)

    expect(parsed.origin).toBe('https://typstpad.example')
    expect(parsed.pathname).toBe('/')
    expect(parsed.searchParams.get('formula')).toBeTruthy()

    stubWindowLocation(shareUrl)
    expect(getFormulaFromUrl()).toBe(code)
  })

  it('returns null when the formula parameter is missing or invalid', () => {
    stubWindowLocation('https://typstpad.example/')
    expect(getFormulaFromUrl()).toBeNull()

    stubWindowLocation('https://typstpad.example/?formula=not-base64%21')
    expect(getFormulaFromUrl()).toBeNull()
  })
})
