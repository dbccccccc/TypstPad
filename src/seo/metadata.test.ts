import { describe, expect, it } from 'vitest'
import { getPageMetadata, getStructuredData, normalizeSiteUrl, parseIndexable, serializeJsonLd } from './metadata'

const t = (key: string) => key

describe('page metadata', () => {
  it('keeps public pages on their own canonical URLs', () => {
    expect(getPageMetadata('editor', t, 'https://typstpad.com/').canonical).toBe('https://typstpad.com/')
    expect(getPageMetadata('about', t, 'https://typstpad.com').canonical).toBe('https://typstpad.com/about')
    expect(getPageMetadata('guide', t, 'https://typstpad.com').canonical).toBe('https://typstpad.com/guide')
  })

  it('does not assign self-hosted copies to the official website', () => {
    const neutral = getPageMetadata('about', t, '')
    expect(neutral.canonical).toBeNull()
    expect(getStructuredData('about', neutral)).toBeNull()
    expect(getPageMetadata('about', t, 'https://math.example.org').canonical).toBe('https://math.example.org/about')
  })

  it('excludes error pages and respects an operator disabling indexing', () => {
    const missing = getPageMetadata('not-found', t, 'https://typstpad.com')
    expect(missing.robots).toBe('noindex, follow')
    expect(missing.canonical).toBeNull()
    expect(getStructuredData('not-found', missing)).toBeNull()
    const preview = getPageMetadata('editor', t, 'https://preview.example.org', false)
    expect(preview.robots).toBe('noindex, follow')
    expect(getStructuredData('editor', preview)).toBeNull()
  })

  it('rejects origins that would generate invalid or unsafe site URLs', () => {
    for (const value of ['javascript:alert(1)', 'ftp://example.org', 'https://example.org/subpath', 'https://user:pass@example.org', 'https://example.org/?x=1', 'https://example.org/#hash']) {
      expect(() => normalizeSiteUrl(value)).toThrow()
    }
    expect(normalizeSiteUrl(' https://example.org/ ')).toBe('https://example.org')
    expect(normalizeSiteUrl('http://localhost:8080')).toBe('http://localhost:8080')
    expect(normalizeSiteUrl('')).toBe('')
    expect(() => parseIndexable('flase')).toThrow()
    expect(parseIndexable('false')).toBe(false)
  })

  it('serializes structured data without allowing a script-closing string', () => {
    const payload = { description: '</script><script>example</script>' }
    const serialized = serializeJsonLd(payload)
    expect(serialized).not.toContain('<')
    expect(JSON.parse(serialized)).toEqual(payload)
  })
})
