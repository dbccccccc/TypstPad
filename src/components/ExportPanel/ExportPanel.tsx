import { useState, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FloatingMenu, MenuGroupProvider } from '@/components/ui/floating-menu'
import {
  Image,
  Code,
  Share2,
  Download,
  Copy,
  Check,
  FileImage,
  FileCode,
  Link,
  FileType,
  Globe,
} from 'lucide-react'
import { useI18n } from '@/i18n'

interface ExportPanelProps {
  svg: string | null
  code: string
  pngScale: number
  onDownloadPNG: () => void
  onDownloadJPG: () => void
  onDownloadSVG: () => void
  onCopyPNG: () => Promise<boolean> | boolean
  onCopyTypst: () => Promise<boolean> | boolean
  onDownloadTypst: () => void
  onCopySVG: () => Promise<boolean> | boolean
  onCopyHTML: () => Promise<boolean> | boolean
  onDownloadHTML: () => void
  onCopyShareLink: () => Promise<boolean> | boolean
}

type CopyAction = () => Promise<boolean> | boolean

type CopyState = {
  [key: string]: boolean
}

interface MenuItem {
  icon: React.ReactNode
  label: string
  suffix?: string
  onClick: () => void
  showCheck?: boolean
}

interface MenuSection {
  icon: React.ReactNode
  title: string
  items: MenuItem[]
}

const MenuContent = memo(function MenuContent({
  sections,
}: {
  sections: MenuSection[]
}) {
  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {sectionIndex > 0 && <div className="-mx-1 my-1 h-px bg-muted" />}
          <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
            {section.icon}
            {section.title}
          </div>
          {section.items.map((item, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              role="menuitem"
              onClick={item.onClick}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'transition-colors hover:bg-accent hover:text-accent-foreground',
                'gap-2'
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.suffix && (
                <span className="text-xs text-muted-foreground">{item.suffix}</span>
              )}
              {item.showCheck && <Check className="h-4 w-4 text-green-500" />}
            </button>
          ))}
        </div>
      ))}
    </>
  )
})

export default function ExportPanel({
  svg,
  onDownloadPNG,
  onDownloadJPG,
  onDownloadSVG,
  onCopyPNG,
  onCopyTypst,
  onDownloadTypst,
  onCopySVG,
  onCopyHTML,
  onDownloadHTML,
  onCopyShareLink,
}: ExportPanelProps) {
  const [copyState, setCopyState] = useState<CopyState>({})
  const isDisabled = !svg
  const { t } = useI18n()

  const handleCopy = useCallback(async (key: string, action: CopyAction) => {
    let copied = false
    try {
      copied = (await action()) === true
    } catch {
      copied = false
    }

    if (!copied) {
      alert(t('export.error.copyFailed'))
      return
    }

    setCopyState(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopyState(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }, [t])

  const imageSections: MenuSection[] = [
    {
      icon: <Copy className="h-3.5 w-3.5" />,
      title: t('export.section.copy'),
      items: [
        {
          icon: <FileImage className="h-4 w-4 text-blue-500" />,
          label: t('export.copy.png'),
          onClick: () => {
            void handleCopy('png-copy', onCopyPNG)
          },
          showCheck: copyState['png-copy'],
        },
      ],
    },
    {
      icon: <Download className="h-3.5 w-3.5" />,
      title: t('export.section.download'),
      items: [
        {
          icon: <FileImage className="h-4 w-4 text-blue-500" />,
          label: t('export.download.png'),
          suffix: t('export.download.transparent'),
          onClick: onDownloadPNG,
        },
        {
          icon: <FileImage className="h-4 w-4 text-orange-500" />,
          label: t('export.download.jpg'),
          suffix: t('export.download.whiteBg'),
          onClick: onDownloadJPG,
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: t('export.download.svg'),
          suffix: t('export.download.vector'),
          onClick: onDownloadSVG,
        },
      ],
    },
  ]

  const codeSections: MenuSection[] = [
    {
      icon: <Copy className="h-3.5 w-3.5" />,
      title: t('export.section.copy'),
      items: [
        {
          icon: <FileCode className="h-4 w-4 text-cyan-500" />,
          label: t('export.copy.typst'),
          onClick: () => {
            void handleCopy('typst-copy', onCopyTypst)
          },
          showCheck: copyState['typst-copy'],
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: t('export.copy.svg'),
          onClick: () => {
            void handleCopy('svg-copy', onCopySVG)
          },
          showCheck: copyState['svg-copy'],
        },
        {
          icon: <Globe className="h-4 w-4 text-orange-500" />,
          label: t('export.copy.html'),
          onClick: () => {
            void handleCopy('html-copy', onCopyHTML)
          },
          showCheck: copyState['html-copy'],
        },
      ],
    },
    {
      icon: <Download className="h-3.5 w-3.5" />,
      title: t('export.section.download'),
      items: [
        {
          icon: <FileCode className="h-4 w-4 text-cyan-500" />,
          label: t('export.download.typst'),
          suffix: '.typ',
          onClick: onDownloadTypst,
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: t('export.download.svgFile'),
          suffix: '.svg',
          onClick: onDownloadSVG,
        },
        {
          icon: <Globe className="h-4 w-4 text-orange-500" />,
          label: t('export.download.html'),
          suffix: '.html',
          onClick: onDownloadHTML,
        },
      ],
    },
  ]

  const shareCopied = copyState['share'] === true

  return (
    <MenuGroupProvider closeDelay={0}>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Export Image */}
        <FloatingMenu
          menuId="image"
          placement="top-end"
          openOnHover={false}
          closeOnSelect
          disabled={isDisabled}
          contentClassName="min-w-[14rem] max-w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto p-1"
          trigger={({ triggerProps }) => (
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="gap-2 transition-all duration-200 hover:shadow-md"
              {...triggerProps}
            >
              <Image className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{t('export.button.image')}</span>
            </Button>
          )}
        >
          <MenuContent sections={imageSections} />
        </FloatingMenu>

        {/* Export Code */}
        <FloatingMenu
          menuId="code"
          placement="top-end"
          openOnHover={false}
          closeOnSelect
          disabled={isDisabled}
          contentClassName="min-w-[14rem] max-w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto p-1"
          trigger={({ triggerProps }) => (
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="gap-2 transition-all duration-200 hover:shadow-md"
              {...triggerProps}
            >
              <Code className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{t('export.button.code')}</span>
            </Button>
          )}
        >
          <MenuContent sections={codeSections} />
        </FloatingMenu>

        {/* Share */}
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => {
            void handleCopy('share', onCopyShareLink)
          }}
          className="gap-2 transition-all duration-200 hover:shadow-md"
        >
          {shareCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span
            aria-live="polite"
            className={cn(shareCopied ? 'text-xs sm:text-sm' : 'sr-only sm:not-sr-only')}
          >
            {shareCopied ? t('export.button.copied') : t('export.button.share')}
          </span>
          <Link
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground',
              shareCopied ? 'hidden' : 'hidden sm:inline-block'
            )}
          />
        </Button>
      </div>
    </MenuGroupProvider>
  )
}
