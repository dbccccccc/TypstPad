export type OcrProvider = "github"

export interface OcrUser {
  id: string
  provider: OcrProvider
  providerId: string
  name?: string
  email?: string | null
  avatarUrl?: string | null
}

export interface OcrUsage {
  count: number
  limit: number
  resetAt: number
}

export interface OcrResult {
  text: string
  usage?: OcrUsage
}

const DEFAULT_OCR_BASE_URL = "http://localhost:3001"

function resolveOcrBaseUrl(): string {
  const configured =
    import.meta.env.VITE_OCR_BASE_URL ||
    import.meta.env.VITE_AUTH_SERVER_URL ||
    DEFAULT_OCR_BASE_URL

  try {
    if (typeof window !== "undefined") {
      return new URL(configured, window.location.origin).toString().replace(/\/$/, "")
    }
    return new URL(configured).toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_OCR_BASE_URL
  }
}

const OCR_BASE_URL = resolveOcrBaseUrl()
const OCR_ORIGIN = new URL(OCR_BASE_URL).origin

function buildOcrUrl(path: string): string {
  const base = OCR_BASE_URL.endsWith("/") ? OCR_BASE_URL : `${OCR_BASE_URL}/`
  const normalizedPath = path.replace(/^\//, "")
  return new URL(normalizedPath, base).toString()
}

const POPUP_WIDTH = 520
const POPUP_HEIGHT = 640

export async function getOcrSession(): Promise<OcrUser | null> {
  const response = await fetch(buildOcrUrl("/auth/status"), {
    credentials: "include",
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.authenticated ? (data.user as OcrUser) : null
}

export async function logoutOcrSession(): Promise<void> {
  await fetch(buildOcrUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
  })
}

export function openLoginPopup(provider: OcrProvider): Promise<OcrUser> {
  const loginUrl = buildOcrUrl(`/auth/login/${provider}`)
  const popup = window.open(
    loginUrl,
    "ocr-auth",
    buildPopupFeatures(POPUP_WIDTH, POPUP_HEIGHT)
  )

  if (!popup) {
    return Promise.reject(new Error("popup_blocked"))
  }

  const expectedOrigin = OCR_ORIGIN

  return new Promise((resolve, reject) => {
    let resolved = false

    const cleanup = () => {
      window.removeEventListener("message", handleMessage)
      clearInterval(pollTimer)
      clearTimeout(timeout)
    }

    const resolveWithSessionCheck = (fallbackError: string) => {
      getOcrSession()
        .then((user) => {
          if (user) {
            resolve(user)
          } else {
            reject(new Error(fallbackError))
          }
        })
        .catch(() => {
          reject(new Error(fallbackError))
        })
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return
      if (!event.data || typeof event.data !== "object") return

      const payload = event.data as { type?: string; user?: OcrUser; error?: string }
      if (payload.type === "ocr-auth-success" && payload.user) {
        resolved = true
        cleanup()
        resolve(payload.user)
        return
      }

      if (payload.type === "ocr-auth-error") {
        resolved = true
        cleanup()
        reject(new Error(payload.error || "login_failed"))
      }
    }

    const pollTimer = window.setInterval(() => {
      if (popup.closed && !resolved) {
        resolved = true
        cleanup()
        resolveWithSessionCheck("popup_closed")
      }
    }, 500)

    const timeout = window.setTimeout(() => {
      if (!resolved) {
        resolved = true
        cleanup()
        try {
          popup.close()
        } catch {
          // ignore close errors
        }
        resolveWithSessionCheck("popup_timeout")
      }
    }, 60_000)

    window.addEventListener("message", handleMessage)
    popup.focus()
  })
}

export async function submitOcr(image: File): Promise<OcrResult> {
  const formData = new FormData()
  formData.append("image", image)

  const response = await fetch(buildOcrUrl("/ocr"), {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.error || "ocr_failed") as Error & {
      status?: number
      data?: unknown
    }
    error.status = response.status
    error.data = data
    throw error
  }

  return data as OcrResult
}

function buildPopupFeatures(width: number, height: number): string {
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)

  return [
    "popup=yes",
    `width=${Math.round(width)}`,
    `height=${Math.round(height)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(",")
}
