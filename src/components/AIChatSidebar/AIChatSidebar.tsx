import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, Square, Trash2, Settings, Copy, ClipboardPaste, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useTheme } from '@/contexts/ThemeContext'
import {
  type ChatMessage,
  type AISettings,
  type StreamChunk,
  chatCompletionStream,
  buildChatMessages,
  isTauriEnv,
  loadAISettings,
} from '@/services/ai'

interface AIChatSidebarProps {
  open: boolean
  onClose: () => void
  onSettingsClick: () => void
  onInsertCode?: (code: string) => void
}

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

function extractCodeBlocks(content: string): string[] {
  const regex = /```(?:typst)?\s*\n?([\s\S]*?)```/g
  const blocks: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    const code = match[1].trim()
    if (code) blocks.push(code)
  }
  return blocks
}

function MessageContent({
  content,
  onInsertCode,
  onCopyCode,
}: {
  content: string
  onInsertCode?: (code: string) => void
  onCopyCode: (code: string) => void
}) {
  const { t } = useI18n()

  // Split by code blocks and render
  const parts = content.split(/(```(?:typst)?\s*\n?[\s\S]*?```)/g)

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        const codeMatch = part.match(/```(?:typst)?\s*\n?([\s\S]*?)```/)
        if (codeMatch) {
          const code = codeMatch[1].trim()
          return (
            <div key={i} className="relative group">
              <pre className="rounded-md bg-muted/70 p-3 text-xs overflow-x-auto font-mono whitespace-pre-wrap break-words">
                <code>{code}</code>
              </pre>
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onInsertCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[10px] bg-background/80 backdrop-blur-sm"
                    onClick={() => onInsertCode(code)}
                    title={t('ai.insertCode')}
                  >
                    <ClipboardPaste className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px] bg-background/80 backdrop-blur-sm"
                  onClick={() => onCopyCode(code)}
                  title={t('ai.copyCode')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        }
        // Regular text — render with line breaks
        const trimmed = part.trim()
        if (!trimmed) return null
        return (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

let nextId = 0
function genId(): string {
  return `msg-${++nextId}-${Date.now()}`
}

function AIChatSidebar({ open, onClose, onSettingsClick, onInsertCode }: AIChatSidebarProps) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef(false)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus textarea when sidebar opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).catch(() => {
      // Fallback — ignore
    })
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    if (!isTauriEnv()) {
      setMessages(prev => [
        ...prev,
        { id: genId(), role: 'user', content: trimmed },
        { id: genId(), role: 'assistant', content: t('ai.error.notTauri') },
      ])
      setInput('')
      return
    }

    const settings: AISettings = loadAISettings()

    const userMsg: DisplayMessage = { id: genId(), role: 'user', content: trimmed }
    const assistantId = genId()
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)
    abortRef.current = false

    // Build the conversation history for the API
    const chatHistory: ChatMessage[] = [
      ...messages
        .filter(m => !m.isStreaming)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: trimmed },
    ]

    try {
      await chatCompletionStream(
        {
          messages: buildChatMessages(chatHistory),
          model: settings.model || undefined,
          temperature: settings.temperature,
          base_url: settings.baseUrl || undefined,
        },
        (chunk: StreamChunk) => {
          if (abortRef.current) return
          if (chunk.done) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            )
            setIsStreaming(false)
            return
          }
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk.delta }
                : m
            )
          )
        }
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('ai.error.requestFailed')
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: errorMessage, isStreaming: false }
            : m
        )
      )
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, t])

  const handleStop = useCallback(() => {
    abortRef.current = true
    setIsStreaming(false)
    setMessages(prev =>
      prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m))
    )
  }, [])

  const handleClear = useCallback(() => {
    if (isStreaming) return
    setMessages([])
  }, [isStreaming])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const _codeBlocks = extractCodeBlocks // keep import used
  void _codeBlocks

  return (
    <div
      className={`flex flex-col border-l bg-background transition-all duration-200 ${
        open ? 'w-80 lg:w-96' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      {open && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4" />
              {t('ai.title')}
            </h2>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onSettingsClick}
                title={t('ai.settings.title')}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                disabled={isStreaming || messages.length === 0}
                title={t('ai.clear')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <Bot className={`h-10 w-10 ${theme === 'dark' ? 'text-muted-foreground' : 'text-muted-foreground/70'}`} />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('ai.welcome')}
                </p>
                {!isTauriEnv() && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3 text-xs text-amber-800 dark:text-amber-200">
                    {t('ai.error.notTauri')}
                  </div>
                )}
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <MessageContent
                    content={msg.content || (msg.isStreaming ? t('ai.thinking') : '')}
                    onInsertCode={msg.role === 'assistant' ? onInsertCode : undefined}
                    onCopyCode={handleCopyCode}
                  />
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/60 animate-pulse rounded-sm" />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ai.placeholder')}
                rows={1}
                className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleStop}
                  title={t('ai.stop')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  title={t('ai.send')}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Collapsed toggle tab */}
      {!open && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex h-24 w-6 items-center justify-center rounded-l-md border border-r-0 bg-background hover:bg-muted transition-colors"
          title={t('ai.toggle')}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      )}
    </div>
  )
}

export default AIChatSidebar
