import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: {
  'site-url': { type: 'string', default: '' },
  'base-url': { type: 'string' },
  noindex: { type: 'boolean', default: false },
} })
const siteUrl = values['site-url'].replace(/\/$/, '')
const routes = ['/', '/about', '/guide']
const retiredGuides = ['/guides/typst-to-png-svg', '/guides/image-to-typst']
const titles = new Set()
const descriptions = new Set()

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]+)>`, 'g'))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1], attribute[2].replace(/&amp;/g, '&')]))
  )
}

for (const route of routes) {
  const file = path.join('dist', route.slice(1), 'index.html')
  const html = await readFile(file, 'utf8')
  const head = html.split('</head>')[0]
  const pageTitles = [...head.matchAll(/<title>(.*?)<\/title>/g)]
  assert.equal(pageTitles.length, 1, `${route}: one title`)
  titles.add(pageTitles[0][1])
  const meta = tags(head, 'meta')
  const description = meta.filter((tag) => tag.name === 'description')
  assert.equal(description.length, 1, `${route}: one description`)
  assert.ok(description[0].content.length > 60, `${route}: meaningful description`)
  descriptions.add(description[0].content)
  assert.equal(meta.find((tag) => tag.name === 'robots')?.content, values.noindex ? 'noindex, follow' : 'index, follow')
  const links = tags(head, 'link')
  const canonical = links.filter((tag) => tag.rel === 'canonical')
  assert.deepEqual(canonical.map((tag) => tag.href), siteUrl ? [siteUrl + route] : [], `${route}: correct canonical domain and path`)
  assert.equal(meta.find((tag) => tag.property === 'og:url')?.content, siteUrl ? siteUrl + route : undefined)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${route}: visible page heading`)
  assert.ok(!html.includes('<!--app-html-->') && !html.includes('<!--seo-head-->'), `${route}: rendered placeholders`)
  assert.ok(!links.some((tag) => /vendor-(monaco|typst)|\.wasm/.test(tag.href ?? '')), `${route}: no eager editor/compiler preload`)
  for (const tag of [...tags(head, 'script'), ...links.filter((link) => link.rel === 'stylesheet')]) {
    const asset = tag.src ?? tag.href
    if (asset?.startsWith('/')) await access(path.join('dist', asset.slice(1)))
  }
  if (route === '/') {
    for (const destination of routes.slice(1)) assert.ok(tags(html, 'a').some((tag) => tag.href === destination), `Homepage links to ${destination}`)
    assert.ok(html.includes('sum_(i=1)^n'), 'Homepage includes a readable formula example')
  }
  assert.ok(!tags(html, 'a').some((tag) => retiredGuides.includes(tag.href)), `${route}: no links to retired pages`)
  if (route === '/guide') {
    for (const section of ['export', 'image-to-typst', 'saving-and-sharing']) {
      assert.ok(html.includes(`id="${section}"`), `Guide includes ${section}`)
      assert.ok(tags(html, 'a').some((tag) => tag.href === `#${section}`), `Guide links to ${section}`)
    }
    assert.ok(html.includes('sum_(i=1)^n'), 'Guide includes its worked example')
  }
  const dataMatch = head.match(/<script id="page-structured-data" type="application\/ld\+json">(.*?)<\/script>/)
  if (siteUrl && !values.noindex) assert.equal(JSON.parse(dataMatch?.[1] ?? '{}').url, siteUrl + route)
  else assert.equal(dataMatch, null)
}
assert.equal(titles.size, routes.length, 'Every public page has its own title')
assert.equal(descriptions.size, routes.length, 'Every public page has its own description')

for (const route of retiredGuides) {
  const html = await readFile(path.join('dist', route.slice(1), 'index.html'), 'utf8')
  assert.equal(tags(html, 'meta').find((tag) => tag['http-equiv'] === 'refresh')?.content, '0; url=/guide')
  assert.deepEqual(tags(html, 'link').filter((tag) => tag.rel === 'canonical').map((tag) => tag.href), siteUrl ? [siteUrl + '/guide'] : [])
  assert.equal(tags(html, 'script').length, 0, `${route}: static redirect needs no JavaScript`)
  if (values.noindex) assert.equal(tags(html, 'meta').find((tag) => tag.name === 'robots')?.content, 'noindex, follow')
}

const missing = await readFile('dist/404.html', 'utf8')
assert.equal(tags(missing, 'meta').find((tag) => tag.name === 'robots')?.content, 'noindex, follow')
assert.ok(!tags(missing, 'link').some((tag) => tag.rel === 'canonical'), '404 has no homepage canonical')
const robots = await readFile('dist/robots.txt', 'utf8')
assert.ok(robots.includes('Allow: /'), 'Crawlers can read the indexing directives in HTML')
if (siteUrl && !values.noindex) {
  assert.ok(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`))
  const sitemap = await readFile('dist/sitemap.xml', 'utf8')
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]), routes.map((route) => siteUrl + route))
} else {
  assert.ok(!robots.includes('Sitemap:'))
  await assert.rejects(access('dist/sitemap.xml'), { code: 'ENOENT' })
}

if (values['base-url']) {
  const base = values['base-url']
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) })
      assert.equal(response.status, 200)
      break
    } catch (error) {
      if (attempt === 19) throw error
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  for (const route of [...routes, '/about/', '/about/index.html', '/guide/', '/guide/index.html', '/?formula=eF4y']) {
    const response = await fetch(base + route)
    assert.equal(response.status, 200, `${route}: HTTP 200`)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin')
    assert.equal(response.headers.get('cross-origin-embedder-policy'), 'require-corp')
    assert.match(await response.text(), /<h1\b/)
  }
  for (const route of retiredGuides) {
    for (const suffix of ['', '/', '/index.html']) {
      const response = await fetch(base + route + suffix + '?source=old-guide', { redirect: 'manual' })
      assert.equal(response.status, 301, `${route}${suffix}: permanent redirect`)
      assert.equal(new URL(response.headers.get('location'), base).href, new URL('/guide?source=old-guide', base).href)
    }
  }
  for (const route of ['/seo-check-missing-page', '/assets/seo-check-missing.js']) {
    const response = await fetch(base + route)
    assert.equal(response.status, 404, `${route}: real HTTP 404`)
  }
}
console.log(`SEO checks passed for ${routes.length} pages, 404, robots, sitemap, metadata, and asset links${values['base-url'] ? ', including Nginx HTTP responses' : ''}.`)
