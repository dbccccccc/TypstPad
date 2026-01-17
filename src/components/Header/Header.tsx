import { useTheme, ThemeMode } from '../../contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { FloatingMenu, MenuGroupProvider, useMenuGroup } from '@/components/ui/floating-menu'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, Github, Settings, Bookmark, Check } from 'lucide-react'

interface HeaderProps {
  onSettingsClick: () => void
  onFormulasClick: () => void
}

const themeOptions: Array<{
  value: ThemeMode
  label: string
  Icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

const themeIconMap: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
}

function ThemeMenu({
  mode,
  onChange,
}: {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}) {
  const { closeMenu } = useMenuGroup()

  const handleSelect = (value: ThemeMode) => {
    onChange(value)
    closeMenu()
  }

  return (
    <div className="flex flex-col gap-1">
      {themeOptions.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={cn(
            'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
            'transition-colors hover:bg-accent hover:text-accent-foreground',
            'gap-2',
            mode === value && 'bg-accent text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{label}</span>
          {mode === value && <Check className="h-4 w-4 text-green-500" />}
        </button>
      ))}
    </div>
  )
}

// Version injected by Vite from package.json
declare const __APP_VERSION__: string

function Header({ onSettingsClick, onFormulasClick }: HeaderProps) {
  const { mode, setMode } = useTheme()

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  const ThemeIcon = themeIconMap[mode]

  return (
    <header className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background sm:px-6 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-base font-semibold sm:text-lg">
          TypstPad
        </span>
        <sub className="hidden text-[10px] text-muted-foreground sm:inline">
          v{__APP_VERSION__}
        </sub>
      </div>

      <MenuGroupProvider>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <a
            href="https://github.com/dbccccccc/TypstPad"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center"
            title="GitHub"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <Github className="h-5 w-5" />
            </Button>
          </a>

          <FloatingMenu
            menuId="theme"
            placement="bottom-end"
            contentClassName="min-w-[9rem] p-1"
            trigger={({ triggerProps }) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                title="Theme"
                {...triggerProps}
              >
                <ThemeIcon className="h-4 w-4" />
              </Button>
            )}
          >
            <ThemeMenu mode={mode} onChange={handleThemeChange} />
          </FloatingMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={onFormulasClick}
            title="Saved Formulas"
          >
            <Bookmark className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={onSettingsClick}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </MenuGroupProvider>
    </header>
  )
}

export default Header
