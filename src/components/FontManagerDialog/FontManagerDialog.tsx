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

function formatWeightLabel(weight?: number) {
  if (!weight) return ''
  if (weight >= 700) return 'Bold'
  if (weight <= 300) return 'Light'
  if (weight >= 600) return 'Semibold'
  return ''
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
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{group.family}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`fontManager.category.${group.category}`)}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.fonts.map(font => {
                    const installed = installedBundledIds.includes(font.id)
                    const pending = pendingIds.has(font.id)
                    return (
                      <div key={font.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{font.label}</span>
                          {font.isDefault && (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5">
                              {t('fontManager.defaultTag')}
                            </span>
                          )}
                        </div>
                        <Button
                          variant={installed ? 'secondary' : 'outline'}
                          size="sm"
                          disabled={pending}
                          onClick={() => handleBundledToggle(font.id, !installed)}
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

            {uploadedFonts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('fontManager.uploadedEmpty')}
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFonts.map(font => {
                  const pending = pendingIds.has(font.id)
                  return (
                    <div key={font.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{font.family}</div>
                        <div className="text-xs text-muted-foreground">
                          {getUploadedFontLabel(font)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleRemoveUploaded(font.id)}
                        className="text-destructive hover:text-destructive gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('fontManager.remove')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FontManagerDialog
