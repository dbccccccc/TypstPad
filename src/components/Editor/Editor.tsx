import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type * as Monaco from 'monaco-editor'
import { setupShikiForMonaco, getShikiInitPromise } from '../../utils/shikiSetup'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  fontSize?: number
  theme?: 'light' | 'dark'
  showLineNumbers?: boolean
  enableAutoComplete?: boolean
}

export interface EditorRef {
  insertText: (text: string) => void
}

// Custom loading component that matches the theme
function EditorLoading({ theme }: { theme: 'light' | 'dark' }) {
  const { t } = useI18n()

  return (
    <div className={`w-full h-full flex items-center justify-center ${
      theme === 'dark' ? 'bg-[hsl(0,0%,4%)]' : 'bg-white'
    }`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('editor.loading')}</span>
      </div>
    </div>
  )
}

const Editor = forwardRef<EditorRef, EditorProps>(({
  value,
  onChange,
  fontSize = 14,
  theme = 'light',
  showLineNumbers = true,
  enableAutoComplete = true
}, ref) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monaco = useMonaco()

  // Re-apply theme after Shiki initialization
  useEffect(() => {
    if (!monaco) return

    const applyTheme = async () => {
      // Wait for Shiki initialization to complete
      const initPromise = getShikiInitPromise()
      if (initPromise) {
        await initPromise
      }
      const themeName = theme === 'dark' ? 'vitesse-dark' : 'vitesse-light'
      monaco.editor.setTheme(themeName)
    }

    applyTheme()
  }, [monaco, theme])

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const editor = editorRef.current
      if (!editor) return

      const selection = editor.getSelection()
      if (!selection) return

      editor.executeEdits('toolbar', [
        {
          range: selection,
          text: text,
          forceMoveMarkers: true,
        },
      ])

      editor.focus()
    },
  }))

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '')
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

  const handleBeforeMount = async (monaco: typeof Monaco) => {
    await setupShikiForMonaco(monaco)
  }

  return (
    <div className={`monaco-editor-container w-full h-full overflow-hidden ${
      theme === 'dark' ? 'bg-[hsl(0,0%,4%)]' : 'bg-white'
    }`}>
      <MonacoEditor
        height="100%"
        defaultLanguage="typst"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        beforeMount={handleBeforeMount}
        theme={theme === 'dark' ? 'vitesse-dark' : 'vitesse-light'}
        loading={<EditorLoading theme={theme} />}
        options={{
          minimap: { enabled: false },
          fontSize: fontSize,
          lineNumbers: showLineNumbers ? 'on' : 'off',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          quickSuggestions: enableAutoComplete,
          suggestOnTriggerCharacters: enableAutoComplete,
          wordBasedSuggestions: enableAutoComplete ? 'currentDocument' : 'off',
        }}
      />
    </div>
  )
})

Editor.displayName = 'Editor'

export default Editor
