import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Type, Download, RotateCcw, Calculator } from 'lucide-react'
import { useI18n } from '@/i18n'

export interface Settings {
  fontSize: number
  showLineNumbers: boolean
  pngScale: number
  invertOutputInDark: boolean
  simplifiedFormulaMode: boolean
  startupBehavior: 'lastEdit' | 'blank'
  enableAutoComplete: boolean
  layoutMode: 'vertical' | 'side-by-side'
}

export const defaultSettings: Settings = {
  fontSize: 14,
  showLineNumbers: true,
  pngScale: 2,
  invertOutputInDark: false,
  simplifiedFormulaMode: true,
  startupBehavior: 'lastEdit',
  enableAutoComplete: true,
  layoutMode: 'vertical',
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

function SettingsDialog({ open, onOpenChange, settings, onSettingsChange }: SettingsDialogProps) {
  const { t } = useI18n()

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const handleReset = () => {
    if (confirm(t('settings.reset.confirm'))) {
      onSettingsChange(defaultSettings)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t('settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 sm:space-y-6 py-3 sm:py-4">
          {/* Editor Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Type className="h-4 w-4" />
              {t('settings.section.editor')}
            </h3>

            <div className="space-y-4 pl-0 sm:pl-6">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.fontSize.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.fontSize.help')}</p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-[180px]">
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([value]) => updateSetting('fontSize', value)}
                    min={12}
                    max={24}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{settings.fontSize}px</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.lineNumbers.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.lineNumbers.help')}</p>
                </div>
                <Switch
                  checked={settings.showLineNumbers}
                  onCheckedChange={(checked) => updateSetting('showLineNumbers', checked)}
                />
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.startupBehavior.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.startupBehavior.help')}</p>
                </div>
                <Select
                  value={settings.startupBehavior}
                  onValueChange={(value: 'lastEdit' | 'blank') => updateSetting('startupBehavior', value)}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastEdit">{t('settings.startupBehavior.lastEdit')}</SelectItem>
                    <SelectItem value="blank">{t('settings.startupBehavior.blank')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.autoComplete.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.autoComplete.help')}</p>
                </div>
                <Switch
                  checked={settings.enableAutoComplete}
                  onCheckedChange={(checked) => updateSetting('enableAutoComplete', checked)}
                />
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.layoutMode.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.layoutMode.help')}</p>
                </div>
                <Select
                  value={settings.layoutMode}
                  onValueChange={(value: 'vertical' | 'side-by-side') => updateSetting('layoutMode', value)}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">{t('settings.layoutMode.vertical')}</SelectItem>
                    <SelectItem value="side-by-side">{t('settings.layoutMode.sideBySide')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Output Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Download className="h-4 w-4" />
              {t('settings.section.output')}
            </h3>

            <div className="space-y-4 pl-0 sm:pl-6">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.pngScale.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.pngScale.help')}</p>
                </div>
                <Select
                  value={String(settings.pngScale)}
                  onValueChange={(value) => updateSetting('pngScale', Number(value))}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('settings.pngScale.option1')}</SelectItem>
                    <SelectItem value="2">{t('settings.pngScale.option2')}</SelectItem>
                    <SelectItem value="3">{t('settings.pngScale.option3')}</SelectItem>
                    <SelectItem value="4">{t('settings.pngScale.option4')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.darkPreview.label')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.darkPreview.help')}</p>
                </div>
                <Switch
                  checked={settings.invertOutputInDark}
                  onCheckedChange={(checked) => updateSetting('invertOutputInDark', checked)}
                />
              </div>
            </div>
          </div>

          {/* Formula Mode Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="h-4 w-4" />
              {t('settings.section.formula')}
            </h3>

            <div className="space-y-4 pl-0 sm:pl-6">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.simplifiedMode.label')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.simplifiedMode.help')}
                  </p>
                </div>
                <Switch
                  checked={settings.simplifiedFormulaMode}
                  onCheckedChange={(checked) => updateSetting('simplifiedFormulaMode', checked)}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('settings.reset.button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsDialog
