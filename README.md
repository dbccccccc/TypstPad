# TypstPad

English · [简体中文](README.zh-CN.md)

![Version](https://img.shields.io/badge/version-0.13.0-blue)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A browser workspace for writing, previewing, and sharing Typst formulas. Type a short expression, adapt a template, or recognize a printed formula from an image. Keep the source editable and export the result wherever you need it.

Use the hosted editor at **[typstpad.com](https://typstpad.com/)**. The [Guide](https://typstpad.com/guide) covers formula exports, Image to Typst, saving, and sharing.

## At a glance

- **Live preview.** Edit with Monaco, syntax highlighting, and Typst autocomplete.
- **Quick selection.** Search symbols, structures, functions, and templates from one place.
- **Editable templates.** Start with equations, algebra, calculus, linear algebra, statistics, or probability, then move through the fields with Tab.
- **Practical exports.** Copy a PNG or export PNG, JPG, SVG, HTML, and Typst source.
- **Local formula library.** Autosave a draft and save, load, rename, or delete named formulas in your browser.
- **Image to Typst.** Recognize a single printed formula locally with the experimental TypLens model.
- **An adjustable workspace.** Choose light, dark, or system theme; English or Simplified Chinese; stacked or side-by-side panels; and bundled or uploaded fonts.

No account or application backend is required.

## Write formulas

**Simplified Formula Mode is enabled by default.** Enter math directly, without surrounding `$` signs:

```typst
sum_(i=1)^n i = (n (n + 1)) / 2
```

The preview updates as you type. If you disable Simplified Formula Mode in Settings, write normal Typst markup and wrap mathematical expressions in `$...$`.

Typst keeps common notation short:

| Write | Typst source |
| --- | --- |
| Fraction | `(a + b) / (c + d)` |
| Power and subscript | `x_i^2` |
| Square root | `sqrt(x)` |
| Derivative | `(dif f) / (dif x)` |
| Integral | `integral_a^b f(x) dif x` |
| Matrix | `mat(a, b; c, d)` |
| Symbols and relations | `alpha`, `pi`, `infinity`, `<=`, `!=`, `->` |

For aligned equations, use `&` at the alignment point and a single backslash to separate lines:

```typst
a &= b + c \
x &= y + z
```

See the [Typst reference](https://typst.app/docs/) for the language beyond these examples.

### Quick selection and templates

| Group | Contents |
| --- | --- |
| **Symbols** | Operators, relations, Greek letters, sets, logic, and arrows |
| **Structures** | Fractions, roots, powers, brackets, vectors, and matrices |
| **Functions** | Integrals, sums, products, limits, and trigonometric functions |
| **Templates** | Aligned equations, derivations, piecewise functions, matrix layouts, and common formulas |

Open any group and search by name, symbol, or Typst code. Search spans all four groups. The Quick insert row provides one-click access to common structures.

After inserting a structure or template, replace the selected field and press **Tab** to continue. To build on an existing expression, select it first: selecting `x + y` and inserting a fraction produces `(x + y) / b`.

| Key | Action |
| --- | --- |
| Tab / Shift + Tab | Move between fields in an inserted snippet |
| Arrow keys | Browse items in the open picker |
| Enter | Insert the focused item, or the first result when searching |
| Esc | Close the picker |

## Save, export, and share

The current draft is saved automatically in this browser. **Save** adds a named copy to your collection; **Load** opens a saved formula in the editor. Browser storage is local to the site and browser profile, with no cross-device sync. Download a Typst file for work you want to keep beyond browser storage.

Use **Export Image** or **Export Code** to choose a format:

| Format | Useful for |
| --- | --- |
| PNG | A transparent image for notes and documents; copy or download |
| JPG | An image with a white background |
| SVG | A vector image that stays sharp when resized |
| Typst (`.typ`) | Editable formula source |
| HTML | An HTML snippet or file with the formula image embedded |

Settings includes a 1×–4× export scale for raster images.

**Share** creates a URL containing the formula source. Anyone with the link can read it. The link does not include your formula library, custom fonts, or settings; the recipient may need the same fonts and formula mode to reproduce the result.

## Image to Typst · experimental

Choose **Image to Typst** in the input panel, then select, drop, or paste a PNG, JPEG, or WebP image. Use one tightly cropped, dark-on-light printed formula.

Recognition runs in the browser without uploading the image. The first use downloads the bundled **TypLens-V1 INT8** model and runtime; the model weights are approximately 33.9 MB. Check the generated source and preview before choosing **Use in editor**, which replaces the current editor content. Handwriting and full-page documents are outside the intended input.

The model produces native Typst directly. Incomplete generation and invalid tokens are blocked from insertion. For model details and attribution, see the [model card](public/im2typst/model/MODEL_CARD.md), [inference contract](public/im2typst/model/INFERENCE.md), and [third-party notices](public/im2typst/THIRD_PARTY_NOTICES.md).

## Local development

Requires **Node.js 20 or newer** and npm.

```bash
git clone https://github.com/dbccccccc/TypstPad.git
cd TypstPad
npm ci
npm run dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check, build, and pre-render domain-neutral production files into `dist/` |
| `npm run build:site` | Build the official typstpad.com website |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the existing Vitest tests |
| `npm run lint` | Run ESLint |
| `npm run test:seo` | Check a domain-neutral build's HTML, metadata, routes, and indexing files |

The editor, Guide, and About page are available at `/`, `/guide`, and `/about`. These pages are pre-rendered from the same React components used by the browser. Informational pages do not load Monaco or the Typst compiler on a direct visit. The previous export and image guide URLs permanently redirect to `/guide` in Vite and Nginx.

## Deployment

### Docker

Build and serve this checkout with the included Nginx configuration:

```bash
docker build -t typstpad .
docker run -d --name typstpad -p 8080:80 typstpad
```

Open [http://localhost:8080](http://localhost:8080).

To use a published build from GitHub Container Registry:

```bash
docker run -d --name typstpad -p 8080:80 ghcr.io/dbccccccc/typstpad:latest
```

Choose either the local image or the published image. To pin a published release, replace `latest` with an available numeric version tag. After validation, the release workflow publishes two `linux/amd64` variants from the same source:

| Variant | Version tag | Stable tag | Site metadata |
| --- | --- | --- | --- |
| Self-hosted | `<version>` | `latest` | No fixed canonical domain or sitemap |
| Official website | `<version>-site` | `site-latest` | Canonical URLs, structured data, and sitemap for typstpad.com |

Prereleases receive version tags only. The workflow builds and publishes images; deploying one to a server is a separate step.

For a custom domain, build with its origin:

```bash
docker build --build-arg SITE_URL=https://math.example.org -t typstpad .
```

For the official website, use `--build-arg BUILD_MODE=site`. To exclude an installation from search indexing, use `--build-arg SITE_INDEXABLE=false`. These are **build arguments**; setting environment variables with `docker run -e` does not rewrite the static files in an existing image.

For Docker Compose, save this as `compose.yaml`:

```yaml
services:
  typstpad:
    image: ghcr.io/dbccccccc/typstpad:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

Then run `docker compose up -d`.

### Static hosting

Serve the complete `dist/` output, including nested page directories, bundled fonts, and recognition assets. Resolve `/about` to `/about/index.html` and `/guide` to `/guide/index.html`. Configure HTTP **301** redirects from `/guides/typst-to-png-svg` and `/guides/image-to-typst` (including trailing-slash and `/index.html` variants) to `/guide`; the build includes instant HTML redirects as a fallback for static hosts. Unknown paths must return HTTP **404**; use `404.html` as the error body while preserving that status. Do not fall back to the homepage for unknown paths. Include these cross-origin isolation headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The Vite development server and bundled [Nginx configuration](nginx.conf) already set these headers. Use HTTPS for a public deployment so browser clipboard and service-worker features are available.

Formula compilation and recognition run locally. The app still downloads required assets, and Typst package imports can fetch packages from `packages.typst.org`.

### Website metadata and verification

`npm run build` defaults to a self-hosted build. Set `SITE_URL` to an absolute HTTP(S) origin, with no subpath, query, or fragment, to generate canonical URLs and a sitemap. `npm run build:site` defaults to `https://typstpad.com`; `SITE_URL` can override it. Set these variables in the build environment or an appropriate Vite `.env` file. `SITE_INDEXABLE=false` adds `noindex` to every page and omits the sitemap; robots.txt still allows crawling so crawlers can read that directive.

```bash
npm run build:site
npm run test:seo -- --site-url https://typstpad.com
```

For a custom domain, pass that same origin to `test:seo`. Add `--noindex` when testing a build with indexing disabled. CI verifies both variants and checks real HTTP responses from the Docker image, including missing paths and the cross-origin isolation headers.

After deploying the official build, verify the domain in Google Search Console, submit `https://typstpad.com/sitemap.xml`, and inspect the rendered homepage, Guide, and About page. Track impressions and clicks by page and search query. Shared formula query strings are not sitemap entries; the editor's canonical stays `/`.

## Repository map

| Location | Responsibility |
| --- | --- |
| `src/components/` | Editor, preview, quick selection, exports, and dialogs |
| `src/data/` | Symbols, templates, and completion data |
| `src/services/` | Typst compilation and image recognition |
| `src/utils/` | Local storage, sharing, exports, and editor support |
| `src/i18n/` | English and Simplified Chinese interface text |
| `src/pages/`, `src/navigation/` | Guide, About, not-found page, and crawlable navigation |
| `src/seo/`, `scripts/build.mjs` | Page metadata and static HTML/sitemap generation |
| `public/` | Fonts, recognition assets, and asset caching |

The interface uses React, TypeScript, Vite, Tailwind CSS, Radix UI, and Lucide icons. Monaco and Shiki provide editing and highlighting; typst.ts provides browser compilation.

## Contributing

[Bug reports, ideas](https://github.com/dbccccccc/TypstPad/issues), and pull requests are welcome. Include a reproducible example for bugs and screenshots for interface changes. Keep English and Chinese interface text and READMEs aligned when changing user-facing behavior.

Run the checks relevant to your change. CI runs tests, lint, a dependency audit, and the production build.

## License and credits

TypstPad source is available under the [MIT license](LICENSE). Third-party libraries and model assets retain their own licenses and notices.

- [Typst](https://typst.app/) and [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) — typesetting and browser compilation.
- [Monaco](https://microsoft.github.io/monaco-editor/) and [Shiki](https://shiki.matsu.io/) — editing and syntax highlighting.
- [TypLens](https://github.com/dbccccccc/TypLens) and [ONNX Runtime](https://github.com/microsoft/onnxruntime) — image-to-Typst recognition.
- [Radix UI](https://www.radix-ui.com/) and [Tailwind CSS](https://tailwindcss.com/) — interface foundations.
- [latexlive.com](https://www.latexlive.com/) — inspiration for parts of the original interface.

Model ancestry and training-data attribution, including Pix2Text, TrOCR, IBEM, and UniMER, are recorded in the bundled [model notice](public/im2typst/model/NOTICE.md). Preserve the [third-party notices](public/im2typst/THIRD_PARTY_NOTICES.md) when redistributing the model assets.
