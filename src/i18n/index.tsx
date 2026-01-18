import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import enMessages, { type MessageSchema } from './messages/en'

const STORAGE_KEY = 'typstpad-locale'

const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const localeLoaders: Record<Locale, () => Promise<MessageSchema>> = {
  en: async () => enMessages,
  'zh-CN': async () => (await import('./messages/zh-CN')).default,
}

const messagesCache = new Map<Locale, MessageSchema>([['en', enMessages]])

function normalizeLocale(input: string): string {
  return input.trim().toLowerCase()
}

function matchLocale(input: string | null | undefined): Locale | null {
  if (!input) return null
  const normalized = normalizeLocale(input)
  if (
    normalized === 'zh-cn' ||
    normalized.startsWith('zh-cn-') ||
    normalized === 'zh-hans' ||
    normalized.startsWith('zh-hans-') ||
    normalized === 'zh-sg' ||
    normalized.startsWith('zh-sg-')
  ) {
    return 'zh-CN'
  }
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  return null
}

function getSystemLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const candidate of candidates) {
    const matched = matchLocale(candidate)
    if (matched) return matched
  }
  return null
}

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const matched = matchLocale(stored)
  return matched
}

function resolveInitialLocale(systemLocale: Locale | null): Locale {
  const stored = readStoredLocale()
  if (stored) return stored
  return systemLocale ?? 'en'
}

export function getCurrentLocale(): Locale {
  if (typeof document !== 'undefined') {
    const docLocale = matchLocale(document.documentElement.lang)
    if (docLocale) return docLocale
  }
  const stored = readStoredLocale()
  if (stored) return stored
  return getSystemLocale() ?? 'en'
}

type I18nParams = Record<string, string | number>

interface I18nContextValue {
  locale: Locale
  systemLocale: Locale | null
  setLocale: (locale: Locale) => void
  t: (key: string, params?: I18nParams) => string
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function getMessage(messages: MessageSchema, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = messages
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template
  return Object.keys(params).reduce((result, key) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(params[key]))
  }, template)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [systemLocale, setSystemLocale] = useState<Locale | null>(() => getSystemLocale())
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale(systemLocale))
  const [messages, setMessages] = useState<MessageSchema>(enMessages)

  useEffect(() => {
    const handleChange = () => {
      setSystemLocale(getSystemLocale())
    }
    window.addEventListener('languagechange', handleChange)
    return () => window.removeEventListener('languagechange', handleChange)
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      const cached = messagesCache.get(locale)
      if (cached) {
        setMessages(cached)
        return
      }
      const loader = localeLoaders[locale]
      const nextMessages = await loader()
      messagesCache.set(locale, nextMessages)
      if (active) {
        setMessages(nextMessages)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = locale.toLowerCase()
    document.documentElement.dir = 'ltr'
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    localStorage.setItem(STORAGE_KEY, nextLocale)
  }, [])

  const t = useCallback((key: string, params?: I18nParams) => {
    const template = getMessage(messages, key) ?? getMessage(enMessages, key) ?? key
    return interpolate(template, params)
  }, [messages])

  useEffect(() => {
    document.title = t('app.title')
    const loaderText = document.querySelector('.loader-text')
    if (loaderText) {
      loaderText.textContent = t('common.loading')
    }
  }, [t])

  const formatDate = useCallback((value: Date | number, options?: Intl.DateTimeFormatOptions) => {
    const date = value instanceof Date ? value : new Date(value)
    return new Intl.DateTimeFormat(locale, options).format(date)
  }, [locale])

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value)
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    systemLocale,
    setLocale,
    t,
    formatDate,
    formatNumber,
  }), [locale, systemLocale, setLocale, t, formatDate, formatNumber])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export { SUPPORTED_LOCALES }
