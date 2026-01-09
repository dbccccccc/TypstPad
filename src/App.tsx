import { useState, useCallback, useEffect, useRef } from 'react'
import Editor, { EditorRef } from './components/Editor/Editor'
import MathToolbar from './components/MathToolbar'
import Preview from './components/Preview/Preview'
import ExportPanel from './components/ExportPanel/ExportPanel'
import SettingsDialog, { Settings, defaultSettings } from './components/SettingsDialog/SettingsDialog'
import Header from './components/Header/Header'
import { useTheme } from './contexts/ThemeContext'
import { downloadSVG, downloadPNG, downloadJPG, downloadText, copyToClipboard, copyPNGToClipboard } from './utils/export'
import { generateShareUrl, getFormulaFromUrl } from './utils/share'
import { loadFormulaStorage, saveDraft, addFormula } from './utils/storage'
import { svgToDataUri } from './utils/svg'
import FormulasDialog from './components/FormulasDialog'
import SaveFormulaDialog from './components/FormulasDialog/SaveFormulaDialog'
import { preloadTypst } from './services/typst'
import { Code, Image, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'

function loadSettingsFromStorage(): Settings {
  const saved = localStorage.getItem('typst-editor-settings')
  if (!saved) return defaultSettings

  try {
    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object') return defaultSettings
    return { ...defaultSettings, ...(parsed as Partial<Settings>) }
  } catch {
    return defaultSettings
  }
}

function App() {
  const { theme } = useTheme()
  const editorRef = useRef<EditorRef>(null)
  const [code, setCode] = useState(() => {
    // URL formula always takes priority
    const urlFormula = getFormulaFromUrl()
    if (urlFormula) return urlFormula

    // Check startup behavior setting
    const settings = loadSettingsFromStorage()

    if (settings.startupBehavior === 'blank') {
      return ''
    }
    return loadFormulaStorage().currentDraft
  })
  const [svg, setSvg] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(() => {
    return loadSettingsFromStorage()
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [formulasOpen, setFormulasOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

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

  const handleCompiled = useCallback((newSvg: string | null, _diagnostics: unknown) => {
    setSvg(newSvg)
  }, [])

  const handleInsertSymbol = useCallback((code: string) => {
    editorRef.current?.insertText(code)
  }, [])

  useEffect(() => {
    localStorage.setItem('typst-editor-settings', JSON.stringify(settings))
  }, [settings])

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header onSettingsClick={() => setSettingsOpen(true)} onFormulasClick={() => setFormulasOpen(true)} />

      <main className="flex-1 overflow-auto p-6">
        <div className={`mx-auto ${
          settings.layoutMode === 'side-by-side'
            ? 'max-w-full px-6 lg:flex lg:gap-6 lg:h-full space-y-6 lg:space-y-0'
            : 'max-w-6xl space-y-6'
        }`}>
          {/* Input Section */}
          <section className={`rounded-lg border bg-card shadow-sm ${
            settings.layoutMode === 'side-by-side'
              ? 'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden'
              : ''
          }`}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Code className="h-4 w-4" />
                Input
              </h2>
              <Button
                variant="ghost"
                size="sm"
                disabled={!code.trim()}
                onClick={() => setSaveDialogOpen(true)}
                className="gap-1.5 h-7"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>

            {/* Math Symbol Toolbar */}
            <div className="relative z-10">
              <MathToolbar onInsertSymbol={handleInsertSymbol} />
            </div>

            {/* Editor */}
            <div className={`relative z-0 ${
              settings.layoutMode === 'side-by-side'
                ? 'lg:flex-1 lg:overflow-auto'
                : 'h-[300px]'
            }`}>
              <Editor
                ref={editorRef}
                value={code}
                onChange={setCode}
                fontSize={settings.fontSize}
                theme={theme}
                showLineNumbers={settings.showLineNumbers}
                enableAutoComplete={settings.enableAutoComplete}
              />
            </div>
          </section>

          {/* Output Section */}
          <section className={`rounded-lg border bg-card shadow-sm ${
            settings.layoutMode === 'side-by-side'
              ? 'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden'
              : ''
          }`}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Image className="h-4 w-4" />
                Output
              </h2>
            </div>

            <div className={`flex items-center justify-center p-8 bg-white ${
              theme === 'dark' && settings.invertOutputInDark ? 'invert' : ''
            } ${
              settings.layoutMode === 'side-by-side'
                ? 'lg:flex-1 lg:overflow-auto'
                : 'min-h-[300px]'
            }`}>
              <Preview
                code={code}
                onCompiled={handleCompiled}
                simplifiedFormulaMode={settings.simplifiedFormulaMode}
              />
            </div>

            {/* Export buttons */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <ExportPanel
                svg={svg}
                code={code}
                pngScale={settings.pngScale}
                onDownloadPNG={() => svg && downloadPNG(svg, 'formula.png', settings.pngScale)}
                onDownloadJPG={() => svg && downloadJPG(svg, 'formula.jpg', settings.pngScale)}
                onDownloadSVG={() => svg && downloadSVG(svg)}
                onCopyPNG={() => svg && copyPNGToClipboard(svg, settings.pngScale)}
                onCopyTypst={() => copyToClipboard(code)}
                onDownloadTypst={() => downloadText(code, 'formula.typ')}
                onCopySVG={() => svg && copyToClipboard(svg)}
                onCopyHTML={() => svg && copyToClipboard(
                  `<div class="formula"><img src="${svgToDataUri(svg)}" alt="Formula" /></div>`
                )}
                onDownloadHTML={() => svg && downloadText(
                  `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>Formula</title></head>\n<body>\n<div class="formula"><img src="${svgToDataUri(svg)}" alt="Formula" /></div>\n</body>\n</html>`,
                  'formula.html',
                  'text/html'
                )}
                onCopyShareLink={() => copyToClipboard(generateShareUrl(code))}
              />
            </div>
          </section>
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <FormulasDialog
        open={formulasOpen}
        onOpenChange={setFormulasOpen}
        onLoadFormula={setCode}
      />

      <SaveFormulaDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={(name) => addFormula(name, code)}
      />
    </div>
  )
}

export default App
