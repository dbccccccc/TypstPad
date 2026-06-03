import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Editor, { EditorRef } from './components/Editor/Editor'
import MathToolbar from './components/MathToolbar'
import Preview from './components/Preview/Preview'
import ExportPanel from './components/ExportPanel/ExportPanel'
import SettingsDialog, { Settings, defaultSettings } from './components/SettingsDialog/SettingsDialog'
import Header from './components/Header/Header'
import DocsPage from './pages/DocsPage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'
import { useTheme } from './contexts/ThemeContext'
import { downloadSVG, downloadPNG, downloadJPG, downloadText, copyToClipboard, copyPNGToClipboard } from './utils/export'
import { generateShareUrl, getFormulaFromUrl } from './utils/share'
import { loadFormulaStorage, saveDraft, addFormula } from './utils/storage'
import { svgToDataUri } from './utils/svg'
import FormulasDialog from './components/FormulasDialog'
import SaveFormulaDialog from './components/FormulasDialog/SaveFormulaDialog'
import FontManagerDialog from './components/FontManagerDialog'
import { preloadTypst } from './services/typst'
import { Code, Image, Save as SaveIcon, FolderOpen, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { APP_PAGE_PATHS, resolveAppPage, type AppPage, type NavigablePage } from './navigation/routes'

function readStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

function loadSettingsFromStorage(): Settings {
  const saved = readStorageItem('typst-editor-settings')
  if (!saved) return defaultSettings

  try {
    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object') return defaultSettings
    return { ...defaultSettings, ...(parsed as Partial<Settings>) }
  } catch {
    return defaultSettings
  }
}

const EDITOR_HEIGHT_STORAGE_KEY = 'typst-editor-input-height'
const DEFAULT_EDITOR_HEIGHT = 300
const MIN_EDITOR_HEIGHT = 180
const MAX_EDITOR_HEIGHT_RATIO = 0.75

function clampEditorHeight(height: number): number {
  if (typeof window === 'undefined') {
    return Math.max(MIN_EDITOR_HEIGHT, Math.round(height))
  }

  const maxHeight = Math.max(
    MIN_EDITOR_HEIGHT,
    Math.floor(window.innerHeight * MAX_EDITOR_HEIGHT_RATIO)
  )

  return Math.min(Math.max(Math.round(height), MIN_EDITOR_HEIGHT), maxHeight)
}

function loadEditorHeightFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT_EDITOR_HEIGHT

  const raw = readStorageItem(EDITOR_HEIGHT_STORAGE_KEY)
  if (!raw) return clampEditorHeight(DEFAULT_EDITOR_HEIGHT)

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return clampEditorHeight(DEFAULT_EDITOR_HEIGHT)

  return clampEditorHeight(parsed)
}

function App() {
  const { theme } = useTheme()
  const { t } = useI18n()
  const editorRef = useRef<EditorRef>(null)
  const initialSettings = useMemo(() => loadSettingsFromStorage(), [])
  const [code, setCode] = useState(() => {
    // URL formula always takes priority
    const urlFormula = getFormulaFromUrl()
    if (urlFormula) return urlFormula

    // Check startup behavior setting
    if (initialSettings.startupBehavior === 'blank') {
      return ''
    }
    return loadFormulaStorage().currentDraft
  })
  const [svg, setSvg] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [formulasOpen, setFormulasOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [fontManagerOpen, setFontManagerOpen] = useState(false)
  const [fontRevision, setFontRevision] = useState(0)
  const [activePage, setActivePage] = useState<AppPage>(() => {
    if (typeof window === 'undefined') return 'editor'
    return resolveAppPage(window.location.pathname)
  })
  const [editorHeight, setEditorHeight] = useState(() => loadEditorHeightFromStorage())
  const [isResizingEditor, setIsResizingEditor] = useState(false)
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  // Auto-save draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(code)
    }, 500)
    return () => clearTimeout(timer)
  }, [code])

  // Start preloading WASM in background (non-blocking)
  useEffect(() => {
    preloadTypst().catch((err) => {
      console.error('Failed to preload typst:', err)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      setActivePage(resolveAppPage(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (activePage === 'docs') {
      document.title = t('app.titleDocs')
      return
    }
    if (activePage === 'about') {
      document.title = t('app.titleAbout')
      return
    }
    if (activePage === 'not-found') {
      document.title = t('app.titleNotFound')
      return
    }
    document.title = t('app.title')
  }, [activePage, t])

  const handleCompiled = useCallback((newSvg: string | null, _diagnostics: unknown) => {
    setSvg(newSvg)
  }, [])

  const handleInsertSymbol = useCallback((code: string) => {
    editorRef.current?.insertText(code)
  }, [])

  const handleFontsChanged = useCallback(() => {
    setFontRevision((prev) => prev + 1)
  }, [])

  useEffect(() => {
    writeStorageItem(EDITOR_HEIGHT_STORAGE_KEY, String(editorHeight))
  }, [editorHeight])

  useEffect(() => {
    if (!isResizingEditor) return

    const handlePointerMove = (event: PointerEvent) => {
      const current = resizeStateRef.current
      if (!current) return
      const deltaY = event.clientY - current.startY
      setEditorHeight(clampEditorHeight(current.startHeight + deltaY))
    }

    const stopResizing = () => {
      setIsResizingEditor(false)
      resizeStateRef.current = null
    }

    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', stopResizing)
    document.addEventListener('pointercancel', stopResizing)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', stopResizing)
      document.removeEventListener('pointercancel', stopResizing)
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [isResizingEditor])

  const handleEditorResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (settings.layoutMode === 'side-by-side') return

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: editorHeight,
    }
    setIsResizingEditor(true)
    event.preventDefault()
  }, [editorHeight, settings.layoutMode])

  const handleNavigate = useCallback((nextPage: NavigablePage) => {
    if (typeof window === 'undefined') return

    const nextPath = APP_PAGE_PATHS[nextPage]
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setActivePage(nextPage)
  }, [])

  const handleSaveLocal = useCallback((name: string) => {
    addFormula(name, code, { fallbackName: t('formulas.untitled') })
  }, [code, t])

  useEffect(() => {
    writeStorageItem('typst-editor-settings', JSON.stringify(settings))
  }, [settings])

  const buildFormulaImageHtml = useCallback((svg: string): string => {
    return `<div class="formula"><img src="${svgToDataUri(svg)}" alt="${t('common.formula')}" /></div>`
  }, [t])

  const buildFormulaDocumentHtml = useCallback((svg: string): string => {
    return `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>${t('common.formula')}</title></head>\n<body>\n${buildFormulaImageHtml(svg)}\n</body>\n</html>`
  }, [buildFormulaImageHtml, t])

  const isEditorPage = activePage === 'editor'

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-background">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onNavigate={handleNavigate}
        activePage={activePage}
      />

      {isEditorPage ? (
        <>
          <main className="flex-1 min-h-0 overflow-auto p-3 sm:p-6">
            <div className={`mx-auto ${
              settings.layoutMode === 'side-by-side'
                ? 'max-w-full lg:flex lg:gap-6 lg:h-full space-y-6 lg:space-y-0'
                : 'max-w-6xl space-y-6'
            }`}>
              {/* Input Section */}
              <section className={`rounded-lg border bg-card shadow-sm ${
                settings.layoutMode === 'side-by-side'
                  ? 'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden'
                  : ''
              }`}>
                <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2 sm:px-4 sm:py-3">
                  <h2 className="mr-auto flex min-w-0 items-center gap-2 text-sm font-medium">
                    <Code className="h-4 w-4" />
                    {t('common.input')}
                  </h2>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!code.trim()}
                      onClick={() => setSaveDialogOpen(true)}
                      className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5"
                      aria-label={t('common.save')}
                      title={t('common.save')}
                    >
                      <SaveIcon className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">{t('common.save')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormulasOpen(true)}
                      className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5"
                      aria-label={t('common.load')}
                      title={t('common.load')}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">{t('common.load')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFontManagerOpen(true)}
                      className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5"
                      aria-label={t('common.fonts')}
                      title={t('common.fonts')}
                    >
                      <Type className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only">{t('common.fonts')}</span>
                    </Button>
                  </div>
                </div>

                {/* Math Symbol Toolbar */}
                <div className="relative z-10">
                  <MathToolbar onInsertSymbol={handleInsertSymbol} />
                </div>

                {/* Editor */}
                <div
                  className={`relative z-0 ${
                    settings.layoutMode === 'side-by-side'
                      ? 'lg:flex-1 lg:overflow-auto'
                      : 'min-h-[180px]'
                  }`}
                  style={settings.layoutMode === 'side-by-side' ? undefined : { height: `${editorHeight}px` }}
                >
                  <Editor
                    ref={editorRef}
                    value={code}
                    onChange={setCode}
                    fontSize={settings.fontSize}
                    theme={theme}
                    showLineNumbers={settings.showLineNumbers}
                    enableAutoComplete={settings.enableAutoComplete}
                    simplifiedFormulaMode={settings.simplifiedFormulaMode}
                  />
                </div>
                {settings.layoutMode !== 'side-by-side' && (
                  <button
                    type="button"
                    onPointerDown={handleEditorResizeStart}
                    title={t('editor.resizeInput')}
                    aria-label={t('editor.resizeInput')}
                    className="group flex h-4 w-full cursor-row-resize touch-none items-center justify-center border-t bg-muted/20 hover:bg-muted/35"
                  >
                    <span
                      className={`h-1 w-12 rounded-full transition-colors ${
                        isResizingEditor ? 'bg-muted-foreground/70' : 'bg-muted-foreground/45 group-hover:bg-muted-foreground/65'
                      }`}
                    />
                  </button>
                )}
              </section>

              {/* Output Section */}
              <section className={`rounded-lg border bg-card shadow-sm ${
                settings.layoutMode === 'side-by-side'
                  ? 'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden'
                  : ''
              }`}>
                <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2 sm:px-4 sm:py-3">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    <Image className="h-4 w-4" />
                    {t('common.output')}
                  </h2>
                </div>

                <div className={`flex items-center justify-center bg-white p-4 sm:p-8 ${
                  theme === 'dark' && settings.invertOutputInDark ? 'invert' : ''
                } ${
                  settings.layoutMode === 'side-by-side'
                    ? 'lg:flex-1 lg:overflow-auto'
                    : 'min-h-[240px] sm:min-h-[300px]'
                }`}>
                  <Preview
                    code={code}
                    onCompiled={handleCompiled}
                    simplifiedFormulaMode={settings.simplifiedFormulaMode}
                    fontRevision={fontRevision}
                  />
                </div>

                {/* Export buttons */}
                <div className="flex flex-wrap justify-start gap-1.5 border-t px-3 py-2 sm:justify-end sm:gap-2 sm:px-4 sm:py-3">
                  <ExportPanel
                    svg={svg}
                    code={code}
                    pngScale={settings.pngScale}
                    onDownloadPNG={() => svg && downloadPNG(svg, 'formula.png', settings.pngScale)}
                    onDownloadJPG={() => svg && downloadJPG(svg, 'formula.jpg', settings.pngScale)}
                    onDownloadSVG={() => svg && downloadSVG(svg)}
                    onCopyPNG={() => {
                      if (!svg) return false
                      return copyPNGToClipboard(svg, settings.pngScale)
                    }}
                    onCopyTypst={() => copyToClipboard(code)}
                    onDownloadTypst={() => downloadText(code, 'formula.typ')}
                    onCopySVG={() => {
                      if (!svg) return false
                      return copyToClipboard(svg)
                    }}
                    onCopyHTML={() => {
                      if (!svg) return false
                      return copyToClipboard(buildFormulaImageHtml(svg))
                    }}
                    onDownloadHTML={() => svg && downloadText(
                      buildFormulaDocumentHtml(svg),
                      'formula.html',
                      'text/html'
                    )}
                    onCopyShareLink={() => copyToClipboard(generateShareUrl(code))}
                  />
                </div>
              </section>
            </div>
          </main>

          <FormulasDialog
            open={formulasOpen}
            onOpenChange={setFormulasOpen}
            onLoadFormula={setCode}
          />

          <SaveFormulaDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            content={code}
            onSaveLocal={handleSaveLocal}
          />

          <FontManagerDialog
            open={fontManagerOpen}
            onOpenChange={setFontManagerOpen}
            onFontsChanged={handleFontsChanged}
          />
        </>
      ) : activePage === 'docs' ? (
        <DocsPage />
      ) : activePage === 'about' ? (
        <AboutPage />
      ) : (
        <NotFoundPage onBackToEditor={() => handleNavigate('editor')} />
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  )
}

export default App
