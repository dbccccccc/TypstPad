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
  onCopyPNG: () => void
  onCopyTypst: () => void
  onDownloadTypst: () => void
  onCopySVG: () => void
  onCopyHTML: () => void
  onDownloadHTML: () => void
  onCopyShareLink: () => void
}

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
  onItemClick,
}: {
  sections: MenuSection[]
  onItemClick: (onClick: () => void) => void
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
              onClick={() => onItemClick(item.onClick)}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
                "gap-2"
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

  const handleCopy = useCallback((key: string, action: () => void) => {
    action()
    setCopyState(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopyState(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }, [])

  const handleItemClick = useCallback((onClick: () => void) => {
    onClick()
    // Don't close menu on click, let mouse leave handle it
  }, [])

  const imageSections: MenuSection[] = [
    {
      icon: <Copy className="h-3.5 w-3.5" />,
      title: t('export.section.copy'),
      items: [
        {
          icon: <FileImage className="h-4 w-4 text-blue-500" />,
          label: t('export.copy.png'),
          onClick: () => handleCopy('png-copy', onCopyPNG),
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
          onClick: () => handleCopy('typst-copy', onCopyTypst),
          showCheck: copyState['typst-copy'],
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: t('export.copy.svg'),
          onClick: () => handleCopy('svg-copy', onCopySVG),
          showCheck: copyState['svg-copy'],
        },
        {
          icon: <Globe className="h-4 w-4 text-orange-500" />,
          label: t('export.copy.html'),
          onClick: () => handleCopy('html-copy', onCopyHTML),
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

  return (
    <MenuGroupProvider>
      <div className="flex items-center gap-2">
        {/* Export Image */}
        <FloatingMenu
          menuId="image"
          placement="top-end"
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
          <MenuContent sections={imageSections} onItemClick={handleItemClick} />
        </FloatingMenu>

        {/* Export Code */}
        <FloatingMenu
          menuId="code"
          placement="top-end"
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
          <MenuContent sections={codeSections} onItemClick={handleItemClick} />
        </FloatingMenu>

        {/* Share */}
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={() => handleCopy('share', onCopyShareLink)}
          className="gap-2 transition-all duration-200 hover:shadow-md"
        >
          {copyState['share'] ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span className="sr-only sm:not-sr-only">
            {copyState['share'] ? t('export.button.copied') : t('export.button.share')}
          </span>
          <Link className="hidden sm:inline-block h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </MenuGroupProvider>
  )
}
