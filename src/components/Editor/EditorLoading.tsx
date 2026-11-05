import { Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n'

// Custom loading component that matches the theme
export default function EditorLoading({ theme }: { theme: 'light' | 'dark' }) {
  const { t } = useI18n()

  return (
    <div className={`w-full h-full flex items-center justify-center ${
      theme === 'dark' ? 'bg-[hsl(0,0%,4%)]' : 'bg-white'
    }`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('editor.loading')}</span>
      </div>
    </div>
  )
}
