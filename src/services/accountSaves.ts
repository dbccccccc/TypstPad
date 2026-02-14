import type { SavedFormula } from '@/types/formula'

interface AccountRequestError extends Error {
  status?: number
  data?: unknown
}

const DEFAULT_ACCOUNT_BASE_URL = 'http://localhost:3001'

const ACCOUNT_BASE_URL =
  import.meta.env.VITE_OCR_BASE_URL ||
  import.meta.env.VITE_AUTH_SERVER_URL ||
  DEFAULT_ACCOUNT_BASE_URL

function resolveAccountBaseUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      return new URL(ACCOUNT_BASE_URL, window.location.origin).toString().replace(/\/$/, '')
    }
    return new URL(ACCOUNT_BASE_URL).toString().replace(/\/$/, '')
  } catch {
    return DEFAULT_ACCOUNT_BASE_URL
  }
}

const NORMALIZED_ACCOUNT_BASE_URL = resolveAccountBaseUrl()

function buildAccountUrl(path: string): string {
  const base = NORMALIZED_ACCOUNT_BASE_URL.endsWith('/')
    ? NORMALIZED_ACCOUNT_BASE_URL
    : `${NORMALIZED_ACCOUNT_BASE_URL}/`
  return new URL(path.replace(/^\//, ''), base).toString()
}

async function requestJson<T>(path: string, options: RequestInit): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined && options.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildAccountUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.error || 'account_request_failed') as AccountRequestError
    error.status = response.status
    error.data = data
    throw error
  }

  return data as T
}

export async function listAccountSaves(): Promise<SavedFormula[]> {
  const data = await requestJson<{ items?: SavedFormula[] }>('/account/saves', {
    method: 'GET',
  })
  return Array.isArray(data.items) ? data.items : []
}

export async function createAccountSave(name: string, content: string): Promise<SavedFormula> {
  const data = await requestJson<{ item: SavedFormula }>('/account/saves', {
    method: 'POST',
    body: JSON.stringify({ name, content }),
  })
  return data.item
}

export async function updateAccountSave(
  id: string,
  updates: { name?: string; content?: string }
): Promise<SavedFormula> {
  const data = await requestJson<{ item: SavedFormula }>('/account/saves/' + id, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.item
}

export async function deleteAccountSave(id: string): Promise<void> {
  await requestJson('/account/saves/' + id, {
    method: 'DELETE',
  })
}
