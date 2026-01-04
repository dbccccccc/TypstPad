import { useTheme, ThemeMode } from '../../contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor, Github, Settings, Bookmark } from 'lucide-react'

interface HeaderProps {
  onSettingsClick: () => void
  onFormulasClick: () => void
}

// Version injected by Vite from package.json
declare const __APP_VERSION__: string

function Header({ onSettingsClick, onFormulasClick }: HeaderProps) {
  const { mode, setMode } = useTheme()

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">
          TypstPad
          <sub className="text-[10px] text-muted-foreground ml-1">v{__APP_VERSION__}</sub>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://github.com/dbccccccc/TypstPad"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center"
          title="GitHub"
        >
          <Button variant="ghost" size="icon">
            <Github className="h-5 w-5" />
          </Button>
        </a>

        <div className="flex items-center rounded-md bg-muted p-1">
          <Button
            variant={mode === 'light' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleThemeChange('light')}
            title="Light Mode"
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === 'system' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleThemeChange('system')}
            title="System Theme"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === 'dark' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleThemeChange('dark')}
            title="Dark Mode"
          >
            <Moon className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onFormulasClick}
          title="Saved Formulas"
        >
          <Bookmark className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}

export default Header
