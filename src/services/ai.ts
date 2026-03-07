// AI service layer — communicates with the Tauri Rust backend via invoke/events.
// When running in the browser (non-Tauri), provides a no-op fallback.

declare const __IS_TAURI__: boolean

// ── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  base_url?: string
}

export interface ChatResponse {
  content: string
  model: string
  finish_reason: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  delta: string
  done: boolean
}

export interface AISettings {
  apiKey: string
  model: string
  baseUrl: string
  temperature: number
}

export const defaultAISettings: AISettings = {
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',
  temperature: 0.7,
}

// ── Tauri helpers (lazy-loaded to avoid errors in browser) ──────────────────

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

async function tauriListen(
  event: string,
  handler: (payload: StreamChunk) => void
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<StreamChunk>(event, (ev) => handler(ev.payload))
  return unlisten
}

// ── Runtime detection ───────────────────────────────────────────────────────

export function isTauriEnv(): boolean {
  return typeof __IS_TAURI__ !== 'undefined' && __IS_TAURI__
}

// ── API Key Management ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'typstpad-ai-settings'

function loadAISettingsFromStorage(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultAISettings
    const parsed = JSON.parse(raw) as Partial<AISettings>
    return { ...defaultAISettings, ...parsed }
  } catch {
    return defaultAISettings
  }
}

function saveAISettingsToStorage(settings: AISettings): void {
  try {
    // Never persist the full API key in localStorage in Tauri mode — it's in Rust memory.
    const toStore = isTauriEnv()
      ? { ...settings, apiKey: '' }
      : { ...settings, apiKey: '' } // Also don't store in browser for safety
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore))
  } catch {
    // Ignore storage failures
  }
}

export function loadAISettings(): AISettings {
  return loadAISettingsFromStorage()
}

export function saveAISettings(settings: AISettings): void {
  saveAISettingsToStorage(settings)
}

// ── API Key Store (Tauri backend) ───────────────────────────────────────────

export async function storeApiKey(key: string): Promise<void> {
  if (isTauriEnv()) {
    await tauriInvoke('store_api_key', { key })
  }
}

export async function getApiKeyMasked(): Promise<string | null> {
  if (isTauriEnv()) {
    return tauriInvoke<string | null>('get_api_key')
  }
  return null
}

export async function removeApiKey(): Promise<void> {
  if (isTauriEnv()) {
    await tauriInvoke('remove_api_key')
  }
}

// ── Chat Completion (non-streaming) ─────────────────────────────────────────

export async function chatCompletion(request: ChatRequest): Promise<ChatResponse> {
  if (isTauriEnv()) {
    return tauriInvoke<ChatResponse>('chat_completion', { request })
  }
  throw new Error('AI features require the Tauri desktop app')
}

// ── Streaming Chat ──────────────────────────────────────────────────────────

export async function chatCompletionStream(
  request: ChatRequest,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> {
  if (!isTauriEnv()) {
    throw new Error('AI features require the Tauri desktop app')
  }

  // Set up listener BEFORE invoking so we don't miss early chunks
  const unlisten = await tauriListen('ai-stream-chunk', onChunk)

  try {
    await tauriInvoke('chat_completion_stream', { request })
  } finally {
    unlisten()
  }
}

// ── Prompt Helpers ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Typst assistant embedded in TypstPad, a Typst formula editor.
You help users write, debug, and improve Typst code — especially math formulas.
When suggesting code, wrap Typst snippets in \`\`\`typst code blocks.
Be concise but thorough. Prefer showing corrected code over lengthy explanations.`

export function buildChatMessages(
  userMessages: ChatMessage[],
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
  ]
}

export function buildInlineCompletionPrompt(
  codeBefore: string,
  codeAfter: string,
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are an inline code completion engine for Typst. Given the code before and after the cursor, output ONLY the completion text that should be inserted at the cursor position. Do not include any explanation, markdown formatting, or code blocks. Output raw Typst code only.`,
    },
    {
      role: 'user',
      content: `Complete the Typst code at the cursor position (marked by |cursor|):\n\n${codeBefore}|cursor|${codeAfter}`,
    },
  ]
}
