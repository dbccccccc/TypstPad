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
import { Settings as SettingsIcon, Type, Download, RotateCcw } from 'lucide-react'

export interface Settings {
  fontSize: number
  showLineNumbers: boolean
  pngScale: number
  invertOutputInDark: boolean
}

export const defaultSettings: Settings = {
  fontSize: 14,
  showLineNumbers: true,
  pngScale: 2,
  invertOutputInDark: false,
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

function SettingsDialog({ open, onOpenChange, settings, onSettingsChange }: SettingsDialogProps) {
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      onSettingsChange(defaultSettings)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Editor Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Type className="h-4 w-4" />
              Editor Settings
            </h3>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Font Size</Label>
                  <p className="text-xs text-muted-foreground">Adjust editor font size</p>
                </div>
                <div className="flex items-center gap-3 w-[180px]">
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Line Numbers</Label>
                  <p className="text-xs text-muted-foreground">Display line numbers in editor</p>
                </div>
                <Switch
                  checked={settings.showLineNumbers}
                  onCheckedChange={(checked) => updateSetting('showLineNumbers', checked)}
                />
              </div>
            </div>
          </div>

          {/* Output Settings */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Download className="h-4 w-4" />
              Output Settings
            </h3>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PNG Export Scale</Label>
                  <p className="text-xs text-muted-foreground">Higher scale = sharper image</p>
                </div>
                <Select
                  value={String(settings.pngScale)}
                  onValueChange={(value) => updateSetting('pngScale', Number(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x (Recommended)</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                    <SelectItem value="4">4x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Force Dark Preview Background</Label>
                  <p className="text-xs text-muted-foreground">Enable dark background for preview in dark mode. Formula colors will be inverted for readability.</p>
                </div>
                <Switch
                  checked={settings.invertOutputInDark}
                  onCheckedChange={(checked) => updateSetting('invertOutputInDark', checked)}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsDialog
