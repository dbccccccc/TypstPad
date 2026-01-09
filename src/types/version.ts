export interface VersionInfo {
  version: string
  buildTime: string
}

export interface VersionCheckResult {
  hasUpdate: boolean
  currentVersion: string
  remoteVersion: string | null
}
