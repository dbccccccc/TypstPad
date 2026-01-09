import { useState, useEffect, useCallback } from 'react'
import { checkForUpdates } from '@/services/versionService'
import type { VersionCheckResult } from '@/types/version'

const CHECK_INTERVAL = 30 * 60 * 1000 // 30 minutes
const INITIAL_DELAY = 5000 // 5 seconds
const SNOOZE_DURATION = 30 * 60 * 1000 // 30 minutes

const LAST_CHECK_KEY = 'typstpad-last-version-check'
const SNOOZE_KEY = 'typstpad-update-snooze'

/**
 * Check if version check should be performed
 */
function shouldCheck(): boolean {
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
  if (!lastCheck) return true

  const elapsed = Date.now() - parseInt(lastCheck, 10)
  return elapsed >= CHECK_INTERVAL
}

/**
 * Check if update is snoozed
 */
function isSnoozed(): boolean {
  const snoozeTime = localStorage.getItem(SNOOZE_KEY)
  if (!snoozeTime) return false

  const elapsed = Date.now() - parseInt(snoozeTime, 10)
  return elapsed < SNOOZE_DURATION
}

/**
 * Set update snooze
 */
export function snoozeUpdate(): void {
  localStorage.setItem(SNOOZE_KEY, Date.now().toString())
}

/**
 * Version check hook
 */
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult | null>(null)

  const checkVersion = useCallback(async () => {
    // Skip in development environment
    if (import.meta.env.DEV) {
      console.log('[Dev] Version check disabled in development')
      return
    }

    // Check if update is snoozed
    if (isSnoozed()) {
      return
    }

    // Check frequency limit
    if (!shouldCheck()) {
      return
    }

    const result = await checkForUpdates()
    if (result.hasUpdate) {
      setUpdateAvailable(true)
      setVersionInfo(result)
    }

    // Update last check time
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
  }, [])

  useEffect(() => {
    // Initial delayed check
    const initialTimer = setTimeout(checkVersion, INITIAL_DELAY)

    // Periodic check
    const intervalTimer = setInterval(checkVersion, CHECK_INTERVAL)

    // Check on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion])

  return { updateAvailable, versionInfo, checkVersion }
}
