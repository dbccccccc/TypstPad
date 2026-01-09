import type { VersionInfo, VersionCheckResult } from '@/types/version'

declare const __APP_VERSION__: string

/**
 * Fetch remote version information
 */
export async function fetchRemoteVersion(): Promise<VersionInfo | null> {
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.warn('Failed to fetch version:', error)
    return null
  }
}

/**
 * Get current application version
 */
export function getCurrentVersion(): string {
  return __APP_VERSION__
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<VersionCheckResult> {
  const current = getCurrentVersion()
  const remote = await fetchRemoteVersion()

  if (!remote) {
    return { hasUpdate: false, currentVersion: current, remoteVersion: null }
  }

  const hasUpdate = current !== remote.version
  return {
    hasUpdate,
    currentVersion: current,
    remoteVersion: remote.version
  }
}
