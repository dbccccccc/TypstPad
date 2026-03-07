import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Bot, Key, Trash2, Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import {
  type AISettings,
  defaultAISettings,
  saveAISettings,
  storeApiKey,
  getApiKeyMasked,
  removeApiKey,
  isTauriEnv,
} from '@/services/ai'

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AISettings
  onSettingsChange: (settings: AISettings) => void
}

function AISettingsDialog({ open, onOpenChange, settings, onSettingsChange }: AISettingsDialogProps) {
  const { t } = useI18n()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [enableInlineCompletion, setEnableInlineCompletion] = useState(() => {
    try {
      return localStorage.getItem('typstpad-ai-inline-completion') !== 'false'
    } catch {
      return true
    }
  })

  // Load masked key on open
  useEffect(() => {
    if (!open) return
    if (isTauriEnv()) {
      getApiKeyMasked().then(setMaskedKey).catch(() => setMaskedKey(null))
    }
  }, [open])

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return
    try {
      await storeApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      const masked = await getApiKeyMasked()
      setMaskedKey(masked)
    } catch (err) {
      console.error('Failed to store API key:', err)
    }
  }, [apiKeyInput])

  const handleRemoveApiKey = useCallback(async () => {
    try {
      await removeApiKey()
      setMaskedKey(null)
      setApiKeyInput('')
    } catch (err) {
      console.error('Failed to remove API key:', err)
    }
  }, [])

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    const next = { ...settings, [key]: value }
    onSettingsChange(next)
    saveAISettings(next)
  }

  const handleInlineCompletionChange = useCallback((checked: boolean) => {
    setEnableInlineCompletion(checked)
    try {
      localStorage.setItem('typstpad-ai-inline-completion', String(checked))
    } catch {
      // Ignore
    }
  }, [])

  const handleSave = useCallback(() => {
    saveAISettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [settings])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('ai.settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* API Key */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                {t('ai.settings.apiKey')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('ai.settings.apiKeyHelp')}</p>
            </div>

            {maskedKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                  {maskedKey}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveApiKey}
                  title={t('ai.settings.removeKey')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder={t('ai.settings.apiKeyPlaceholder')}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveApiKey()
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {maskedKey ? t('ai.settings.apiKeySet') : t('ai.settings.apiKeyNotSet')}
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label>{t('ai.settings.model')}</Label>
              <p className="text-xs text-muted-foreground">{t('ai.settings.modelHelp')}</p>
            </div>
            <input
              type="text"
              value={settings.model}
              onChange={e => updateSetting('model', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <Label>{t('ai.settings.baseUrl')}</Label>
              <p className="text-xs text-muted-foreground">{t('ai.settings.baseUrlHelp')}</p>
            </div>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={e => updateSetting('baseUrl', e.target.value)}
              placeholder={defaultAISettings.baseUrl}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('ai.settings.temperature')}</Label>
                <p className="text-xs text-muted-foreground">{t('ai.settings.temperatureHelp')}</p>
              </div>
              <span className="text-sm w-12 text-right">{settings.temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) => updateSetting('temperature', value)}
              min={0}
              max={1}
              step={0.1}
              className="flex-1"
            />
          </div>

          {/* Inline Completion Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('ai.settings.inlineCompletion')}</Label>
              <p className="text-xs text-muted-foreground">{t('ai.settings.inlineCompletionHelp')}</p>
            </div>
            <Switch
              checked={enableInlineCompletion}
              onCheckedChange={handleInlineCompletionChange}
            />
          </div>

          {/* Save button */}
          <Button variant="outline" className="w-full" onClick={handleSave}>
            {saved ? <Check className="h-4 w-4 mr-2" /> : null}
            {t('ai.settings.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AISettingsDialog
