import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { build, createServer } from 'vite'

const { values: { mode } } = parseArgs({ options: { mode: { type: 'string', default: 'production' } } })
const outDir = path.resolve('dist')

await build({ mode })
const template = await readFile(path.join(outDir, 'index.html'), 'utf8')
if (!template.includes('<!--seo-head-->') || !template.includes('<!--app-html-->')) {
  throw new Error('The HTML template must include the seo-head and app-html placeholders.')
}

// Render the shared components at build time; production only serves static files.
const renderer = await createServer({
  mode,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
})

try {
  const { renderPage, pages, renderRedirect, redirects, siteUrl, indexable } = await renderer.ssrLoadModule('/src/seo/prerender.tsx')
  for (const [page, urlPath] of [...Object.entries(pages), ['not-found', '/404.html']]) {
    const rendered = renderPage(page)
    const html = template.replace('<!--seo-head-->', () => rendered.head).replace('<!--app-html-->', () => rendered.body)
    const file = page === 'not-found'
      ? path.join(outDir, '404.html')
      : path.join(outDir, urlPath.slice(1), 'index.html')
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, html)
  }

  for (const [urlPath, destination] of Object.entries(redirects)) {
    const file = path.join(outDir, urlPath.slice(1), 'index.html')
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, renderRedirect(destination))
  }

  let robots = 'User-agent: *\nAllow: /\n'
  if (siteUrl && indexable) {
    const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
    const entries = Object.values(pages).map((urlPath) => `  <url><loc>${escapeXml(siteUrl + urlPath)}</loc></url>`)
    await writeFile(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`)
    robots += `Sitemap: ${siteUrl}/sitemap.xml\n`
  }
  await writeFile(path.join(outDir, 'robots.txt'), robots)
  console.log(`Pre-rendered ${Object.keys(pages).length} pages and 404.html. Site URL: ${siteUrl || '(self-hosted; no canonical domain)'}. Indexing: ${indexable ? 'enabled' : 'disabled'}.`)
} finally {
  await renderer.close()
}
