import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Type, Upload, Trash2 } from 'lucide-react'
import {
  addUploadedFonts,
  getBundledFonts,
  getInstalledBundledFontIds,
  getUploadedFonts,
  removeUploadedFont,
  setInstalledBundledFontIds,
  type BundledFont,
  type UploadedFont,
} from '@/services/fonts'
import { refreshTypstFonts } from '@/services/typst'
import { useI18n } from '@/i18n'

interface FontManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFontsChanged?: () => void
}

type FontGroup = {
  family: string
  category: BundledFont['category']
  fonts: BundledFont[]
}

type UploadedFontGroup = {
  family: string
  fonts: UploadedFont[]
  latestAddedAt: number
}

function formatWeightLabel(weight?: number) {
  if (!weight) return ''
  if (weight <= 100) return 'Thin'
  if (weight <= 200) return 'Extra Light'
  if (weight <= 300) return 'Light'
  if (weight <= 400) return 'Regular'
  if (weight <= 500) return 'Medium'
  if (weight <= 600) return 'Semibold'
  if (weight <= 700) return 'Bold'
  if (weight <= 800) return 'Extra Bold'
  return 'Black'
}

function getUploadedFontLabel(font: UploadedFont) {
  const parts = []
  const weightLabel = formatWeightLabel(font.weight)
  if (weightLabel) parts.push(weightLabel)
  if (font.style && font.style !== 'normal') {
    parts.push(font.style[0]?.toUpperCase() + font.style.slice(1))
  }
  return parts.join(' ') || font.fileName
}

function getUploadedFamilyKey(family: string) {
  return family.trim().toLowerCase()
}

function getUploadedVariantSortKey(font: UploadedFont) {
  return {
    weight: font.weight ?? 400,
    style: font.style ?? '',
    fileName: font.fileName,
  }
}

function FontManagerDialog({ open, onOpenChange, onFontsChanged }: FontManagerDialogProps) {
  const { t } = useI18n()
  const bundledFonts = useMemo(() => getBundledFonts(), [])
  const [installedBundledIds, setInstalledBundledIds] = useState<string[]>([])
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([])
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupedFonts = useMemo<FontGroup[]>(() => {
    const map = new Map<string, FontGroup>()
    for (const font of bundledFonts) {
      const existing = map.get(font.family)
      if (existing) {
        existing.fonts.push(font)
      } else {
        map.set(font.family, {
          family: font.family,
          category: font.category,
          fonts: [font],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aDefault = a.fonts.some(font => font.isDefault) ? 0 : 1
      const bDefault = b.fonts.some(font => font.isDefault) ? 0 : 1
      if (aDefault !== bDefault) return aDefault - bDefault
      return a.family.localeCompare(b.family)
    })
  }, [bundledFonts])

  const groupedUploadedFonts = useMemo<UploadedFontGroup[]>(() => {
    const map = new Map<string, UploadedFontGroup>()
    for (const font of uploadedFonts) {
      const key = getUploadedFamilyKey(font.family)
      const existing = map.get(key)
      if (existing) {
        existing.fonts.push(font)
        if (font.addedAt > existing.latestAddedAt) {
          existing.latestAddedAt = font.addedAt
        }
      } else {
        map.set(key, {
          family: font.family,
          fonts: [font],
          latestAddedAt: font.addedAt,
        })
      }
    }
    for (const group of map.values()) {
      group.fonts.sort((a, b) => {
        const aKey = getUploadedVariantSortKey(a)
        const bKey = getUploadedVariantSortKey(b)
        if (aKey.weight !== bKey.weight) return aKey.weight - bKey.weight
        if (aKey.style !== bKey.style) return aKey.style.localeCompare(bKey.style)
        return aKey.fileName.localeCompare(bKey.fileName)
      })
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.latestAddedAt !== b.latestAddedAt) return b.latestAddedAt - a.latestAddedAt
      return a.family.localeCompare(b.family)
    })
  }, [uploadedFonts])

  useEffect(() => {
    if (!open) return
    let active = true
    Promise.all([getInstalledBundledFontIds(), getUploadedFonts()])
      .then(([bundledIds, uploaded]) => {
        if (!active) return
        setInstalledBundledIds(bundledIds)
        setUploadedFonts(uploaded)
      })
      .catch((error) => {
        console.error('Failed to load fonts:', error)
      })
    return () => {
      active = false
    }
  }, [open])

  const updatePending = useCallback((id: string, value: boolean) => {
    setPendingIds(prev => {
      const next = new Set(prev)
      if (value) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleBundledToggle = useCallback(async (fontId: string, install: boolean) => {
    updatePending(fontId, true)
    const nextIds = install
      ? Array.from(new Set([...installedBundledIds, fontId]))
      : installedBundledIds.filter(id => id !== fontId)
    try {
      await setInstalledBundledFontIds(nextIds)
      setInstalledBundledIds(nextIds)
      refreshTypstFonts()
      onFontsChanged?.()
    } finally {
      updatePending(fontId, false)
    }
  }, [installedBundledIds, onFontsChanged, updatePending])

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter(file => /\.(otf|ttf)$/i.test(file.name))
    event.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      const added = await addUploadedFonts(files)
      if (added.length > 0) {
        setUploadedFonts(prev => [...added, ...prev])
        refreshTypstFonts()
        onFontsChanged?.()
      }
    } catch (error) {
      console.error('Failed to upload fonts:', error)
      alert(t('fontManager.uploadError'))
    } finally {
      setUploading(false)
    }
  }, [onFontsChanged, t])

  const handleRemoveUploaded = useCallback(async (fontId: string) => {
    updatePending(fontId, true)
    try {
      await removeUploadedFont(fontId)
      setUploadedFonts(prev => prev.filter(font => font.id !== fontId))
      refreshTypstFonts()
      onFontsChanged?.()
    } finally {
      updatePending(fontId, false)
    }
  }, [onFontsChanged, updatePending])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {t('fontManager.title')}
          </DialogTitle>
          <DialogDescription>
            {t('fontManager.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t('fontManager.bundledTitle')}
            </h3>
            {groupedFonts.map(group => (
              <div key={group.family} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{group.family}</div>
                  <span className="text-xs text-muted-foreground">
                    {t(`fontManager.category.${group.category}`)}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.fonts.map(font => {
                    const installed = installedBundledIds.includes(font.id)
                    const pending = pendingIds.has(font.id)
                    return (
                      <div key={font.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs sm:text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{font.label}</span>
                          {font.isDefault && (
                            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                              {t('fontManager.defaultTag')}
                            </span>
                          )}
                        </div>
                        <Button
                          variant={installed ? 'secondary' : 'outline'}
                          size="sm"
                          disabled={pending}
                          onClick={() => handleBundledToggle(font.id, !installed)}
                          className="h-7 shrink-0 px-2 text-xs"
                        >
                          {installed ? t('fontManager.remove') : t('fontManager.install')}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t('fontManager.uploadedTitle')}
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".otf,.ttf"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('fontManager.upload')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('fontManager.uploadHelp')}
            </p>

            {groupedUploadedFonts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('fontManager.uploadedEmpty')}
              </div>
            ) : (
              <div className="space-y-3">
                {groupedUploadedFonts.map(group => (
                  <div key={group.family} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="text-sm font-medium">{group.family}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.fonts.map(font => {
                        const pending = pendingIds.has(font.id)
                        const label = getUploadedFontLabel(font)
                        const showFileName = label !== font.fileName
                        return (
                          <div key={font.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs sm:text-sm">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{label}</div>
                              {showFileName && (
                                <div className="truncate text-[11px] text-muted-foreground">{font.fileName}</div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={pending}
                              onClick={() => handleRemoveUploaded(font.id)}
                              className="h-7 shrink-0 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('fontManager.remove')}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FontManagerDialog
