import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type * as Monaco from 'monaco-editor'
import './monaco'
import EditorLoading from './EditorLoading'
import { setupShikiForMonaco } from '../../utils/shikiSetup'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  fontSize?: number
  theme?: 'light' | 'dark'
  showLineNumbers?: boolean
  enableAutoComplete?: boolean
  simplifiedFormulaMode?: boolean
}

export interface EditorRef {
  insertText: (text: string, snippet?: string, selectionPlaceholder?: number, groupSelection?: boolean) => void
}

interface SnippetController extends editor.IEditorContribution {
  insert: (template: string) => void
}

const Editor = forwardRef<EditorRef, EditorProps>(({
  value,
  onChange,
  fontSize = 14,
  theme = 'light',
  showLineNumbers = true,
  enableAutoComplete = true,
  simplifiedFormulaMode = false
}, ref) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monaco = useMonaco()
  const languageId = simplifiedFormulaMode ? 'typst-math' : 'typst'

  // Re-apply theme after Shiki initialization
  useEffect(() => {
    if (!monaco) return

    const applyTheme = async () => {
      // Shiki defines the themes. Monaco is bundled, so it is ready before the
      // editor's beforeMount runs; start the setup here too and wait for it.
      await setupShikiForMonaco(monaco)
      const themeName = theme === 'dark' ? 'vitesse-dark' : 'vitesse-light'
      monaco.editor.setTheme(themeName)
    }

    applyTheme()
  }, [monaco, theme])

  useImperativeHandle(ref, () => ({
    insertText: (text: string, snippet?: string, selectionPlaceholder = 1, groupSelection = false) => {
      const editor = editorRef.current
      if (!editor) return

      const selection = editor.getSelection()
      const model = editor.getModel()
      if (!selection || !model) return

      editor.focus()
      const snippetController = editor.getContribution<SnippetController>('snippetController2')
      if (snippet && snippetController) {
        let selectedText = model.getValueInRange(selection)
        if (selectedText && selectionPlaceholder > 0) {
          // A selected expression must stay a single operand in a / b or x^n.
          if (groupSelection && !/^(?:[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*)$/u.test(selectedText)) {
            selectedText = `(${selectedText})`
          }
          const escapedSelection = selectedText.replace(/[\\$}]/g, '\\$&')
          const placeholder = new RegExp(`\\$\\{${selectionPlaceholder}:[^}]*\\}`)
          snippet = snippet.replace(placeholder, () => `\${${selectionPlaceholder}:${escapedSelection}}`)
        }
        snippetController.insert(snippet)
        return
      }

      editor.pushUndoStop()
      editor.executeEdits('toolbar', [
        {
          range: selection,
          text: text,
          forceMoveMarkers: true,
        },
      ])
      editor.pushUndoStop()
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
        defaultLanguage={languageId}
        language={languageId}
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
