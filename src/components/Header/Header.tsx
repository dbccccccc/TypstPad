import { useTheme, ThemeMode } from '../../contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { FloatingMenu, MenuGroupProvider, useMenuGroup } from '@/components/ui/floating-menu'
import { cn } from '@/lib/utils'
import {
  Sun,
  Moon,
  Monitor,
  Settings,
  Check,
  Languages,
  LogIn,
  LogOut,
  User,
  PanelsTopLeft,
  Code2,
  BookOpenText,
  Info,
  ChevronDown,
} from 'lucide-react'
import { useI18n, type Locale } from '@/i18n'
import type { OcrUser } from '@/services/ocr'
import type { AppPage, NavigablePage } from '@/navigation/routes'

interface HeaderProps {
  onSettingsClick: () => void
  onLoginClick: () => void
  onLogoutClick: () => void
  onNavigate: (page: NavigablePage) => void
  activePage: AppPage
  user?: OcrUser | null
  accountFeaturesEnabled?: boolean
}

const pageOptions: Array<{
  value: NavigablePage
  labelKey: 'navigation.editor' | 'navigation.docs' | 'navigation.about'
  Icon: typeof Code2
}> = [
  { value: 'editor', labelKey: 'navigation.editor', Icon: Code2 },
  { value: 'docs', labelKey: 'navigation.docs', Icon: BookOpenText },
  { value: 'about', labelKey: 'navigation.about', Icon: Info },
]

const themeOptions: Array<{
  value: ThemeMode
  labelKey: 'theme.light' | 'theme.system' | 'theme.dark'
  Icon: typeof Sun
}> = [
  { value: 'light', labelKey: 'theme.light', Icon: Sun },
  { value: 'system', labelKey: 'theme.system', Icon: Monitor },
  { value: 'dark', labelKey: 'theme.dark', Icon: Moon },
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
  const { t } = useI18n()

  const handleSelect = (value: ThemeMode) => {
    onChange(value)
    closeMenu()
  }

  return (
    <div className="flex flex-col gap-1">
      {themeOptions.map(({ value, labelKey, Icon }) => (
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
          <span className="flex-1 text-left">{t(labelKey)}</span>
          {mode === value && <Check className="h-4 w-4 text-green-500" />}
        </button>
      ))}
    </div>
  )
}

function PageMenu({
  activePage,
  onNavigate,
}: {
  activePage: AppPage
  onNavigate: (page: NavigablePage) => void
}) {
  const { closeMenu } = useMenuGroup()
  const { t } = useI18n()

  const handleSelect = (page: NavigablePage) => {
    onNavigate(page)
    closeMenu()
  }

  return (
    <div className="flex min-w-[10rem] flex-col gap-1 p-1">
      {pageOptions.map(({ value, labelKey, Icon }) => (
        <button
          key={value}
          type="button"
          role="menuitem"
          onClick={() => handleSelect(value)}
          className={cn(
            'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
            'transition-colors hover:bg-accent hover:text-accent-foreground',
            'gap-2',
            activePage === value && 'bg-accent text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{t(labelKey)}</span>
          {activePage === value && <Check className="h-4 w-4 text-green-500" />}
        </button>
      ))}
    </div>
  )
}

function AccountMenu({
  user,
  onLogout,
}: {
  user: OcrUser
  onLogout: () => void
}) {
  const { closeMenu } = useMenuGroup()
  const { t } = useI18n()

  const handleLogout = () => {
    onLogout()
    closeMenu()
  }

  const email = user.email || t('header.emailUnavailable')

  return (
    <div className="flex min-w-[12rem] flex-col gap-2 p-2">
      <div className="flex flex-col">
        {user.name && <span className="text-sm font-medium">{user.name}</span>}
        <span className="text-xs text-muted-foreground">{email}</span>
      </div>
      <div className="h-px bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start gap-2"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        {t('header.logout')}
      </Button>
    </div>
  )
}

// Version injected by Vite from package.json
declare const __APP_VERSION__: string

function isSafeAvatarUrl(value?: string | null): boolean {
  if (!value) return false
  if (value.startsWith('data:') || value.startsWith('blob:')) return true
  if (typeof window === 'undefined') return false

  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

function Header({
  onSettingsClick,
  onLoginClick,
  onLogoutClick,
  onNavigate,
  activePage,
  user,
  accountFeaturesEnabled = true,
}: HeaderProps) {
  const { mode, setMode } = useTheme()
  const { t, locale, setLocale, systemLocale } = useI18n()

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode)
  }

  const userLabel = user?.name || user?.email || t('header.account')
  const accountButtonLabel = accountFeaturesEnabled ? t('header.login') : t('common.comingSoon')
  const ThemeIcon = themeIconMap[mode] ?? Monitor
  const systemSuffix = systemLocale ? ` (${t('language.systemSuffix')})` : ''
  const languageOptions: Array<{ value: Locale; label: string }> = [
    { value: 'en', label: t('language.name.en') },
    { value: 'zh-CN', label: t('language.name.zhCN') },
  ]
  const shouldShowAccountMenu = accountFeaturesEnabled && Boolean(user)
  const canRenderAvatar = shouldShowAccountMenu && isSafeAvatarUrl(user?.avatarUrl)

  return (
    <MenuGroupProvider>
      <header className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-6 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate('editor')}
          className="truncate text-left text-base font-semibold sm:text-lg"
        >
          TypstPad
        </button>

        <FloatingMenu
          menuId="pages"
          placement="bottom-start"
          openOnHover={false}
          contentClassName="p-0"
          containerClassName="md:hidden"
          trigger={({ triggerProps }) => (
            <Button
              variant="secondary"
              size="sm"
              className="ml-1 h-8 gap-1.5 px-2.5 text-xs"
              title={t('navigation.pages')}
              {...triggerProps}
            >
              <PanelsTopLeft className="h-3.5 w-3.5" />
              <span>{t('navigation.pages')}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
        >
          <PageMenu activePage={activePage} onNavigate={onNavigate} />
        </FloatingMenu>

        <sub className="hidden text-[10px] text-muted-foreground sm:inline">
          v{__APP_VERSION__}
        </sub>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {pageOptions.map(({ value, labelKey, Icon }) => (
            <Button
              key={value}
              type="button"
              variant={activePage === value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate(value)}
              className="h-8 gap-1.5 px-2.5"
            >
              <Icon className="h-4 w-4" />
              <span>{t(labelKey)}</span>
            </Button>
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <FloatingMenu
            menuId="theme"
            placement="bottom-end"
            contentClassName="min-w-[9rem] p-1"
            trigger={({ triggerProps }) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                title={t('header.theme')}
                {...triggerProps}
              >
                <ThemeIcon className="h-4 w-4" />
              </Button>
            )}
          >
            <ThemeMenu mode={mode} onChange={handleThemeChange} />
          </FloatingMenu>

          <FloatingMenu
            menuId="language"
            placement="bottom-end"
            contentClassName="min-w-[10rem] p-1"
            trigger={({ triggerProps }) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                title={t('header.language')}
                {...triggerProps}
              >
                <Languages className="h-4 w-4" />
              </Button>
            )}
          >
            <div className="flex flex-col gap-1">
              {languageOptions.map(({ value, label }) => {
                const suffix = systemLocale === value ? systemSuffix : ''
                return (
                  <button
                    key={value}
                    onClick={() => setLocale(value)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'transition-colors hover:bg-accent hover:text-accent-foreground',
                      'gap-2',
                      locale === value && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span className="flex-1 text-left">{label}{suffix}</span>
                    {locale === value && <Check className="h-4 w-4 text-green-500" />}
                  </button>
                )
              })}
            </div>
          </FloatingMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={onSettingsClick}
            title={t('header.settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
          {shouldShowAccountMenu && user ? (
            <FloatingMenu
              menuId="account"
              placement="bottom-end"
              openOnHover={false}
              contentClassName="p-0"
              trigger={({ triggerProps }) => (
                <Button
                  {...triggerProps}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-9 w-9 rounded-full p-0 leading-none sm:ml-2 sm:h-10 sm:w-10"
                  title={userLabel}
                  aria-label={userLabel}
                >
                  {canRenderAvatar ? (
                    <span className="h-7 w-7 overflow-hidden rounded-full bg-muted sm:h-8 sm:w-8">
                      <img
                        src={user.avatarUrl || undefined}
                        alt={userLabel}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted sm:h-8 sm:w-8">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                </Button>
              )}
            >
              <AccountMenu user={user} onLogout={onLogoutClick} />
            </FloatingMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-9 gap-2 px-2 sm:ml-2 sm:h-10 sm:px-3"
              onClick={onLoginClick}
              title={accountButtonLabel}
              aria-label={accountButtonLabel}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">{accountButtonLabel}</span>
            </Button>
          )}
      </div>
    </header>
  </MenuGroupProvider>
  )
}

export default Header
