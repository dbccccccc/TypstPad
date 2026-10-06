import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Renderer } from '@/components/SettingsDialog/SettingsDialog'
import { useI18n } from '@/i18n'

interface RendererSelectProps {
  value: Renderer
  onChange: (renderer: Renderer) => void
}

/** Chooses between Typlet and the legacy typst.ts compiler. */
export default function RendererSelect({ value, onChange }: RendererSelectProps) {
  const { t } = useI18n()

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">{t('renderer.label')}</span>
      <Select value={value} onValueChange={(next) => onChange(next as Renderer)}>
        <SelectTrigger
          aria-label={t('renderer.label')}
          title={t('renderer.label')}
          className="h-7 w-auto gap-1.5 bg-background px-2.5 text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="typlet" className="text-xs">Typlet</SelectItem>
          <SelectItem value="typst-ts" className="text-xs">
            <span className="inline-flex items-center gap-1.5">
              typst.ts
              <span className="rounded border px-1 text-[10px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">
                {t('renderer.legacy')}
              </span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
