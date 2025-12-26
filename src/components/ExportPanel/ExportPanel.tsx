import { useState, useRef, useCallback, useEffect, memo, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

// Context for managing which menu is open (prevents overlap)
const MenuContext = createContext<{
  activeMenu: string | null
  isClosing: boolean
  openMenu: (id: string) => void
  closeMenu: () => void
}>({
  activeMenu: null,
  isClosing: false,
  openMenu: () => {},
  closeMenu: () => {},
})

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

function HoverMenu({
  menuId,
  trigger,
  sections,
  disabled,
}: {
  menuId: string
  trigger: React.ReactNode
  sections: MenuSection[]
  disabled?: boolean
}) {
  const { activeMenu, isClosing, openMenu, closeMenu } = useContext(MenuContext)
  const containerRef = useRef<HTMLDivElement>(null)

  const isOpen = activeMenu === menuId

  const handleMouseEnter = useCallback(() => {
    if (disabled) return
    openMenu(menuId)
  }, [disabled, menuId, openMenu])

  const handleMouseLeave = useCallback(() => {
    closeMenu()
  }, [closeMenu])

  const handleItemClick = useCallback((onClick: () => void) => {
    onClick()
    // Don't close menu on click, let mouse leave handle it
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full right-0 mb-1 z-50",
            "min-w-[14rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            isClosing ? "animate-menu-hide" : "animate-menu-show"
          )}
        >
          <MenuContent sections={sections} onItemClick={handleItemClick} />
        </div>
      )}
    </div>
  )
}

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
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const closingAnimationRef = useRef<ReturnType<typeof setTimeout>>()
  const isDisabled = !svg

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(closeTimeoutRef.current)
      clearTimeout(closingAnimationRef.current)
    }
  }, [])

  const openMenu = useCallback((id: string) => {
    clearTimeout(closeTimeoutRef.current)
    clearTimeout(closingAnimationRef.current)
    setIsClosing(false)
    setActiveMenu(id)
  }, [])

  const closeMenu = useCallback(() => {
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(true)
      closingAnimationRef.current = setTimeout(() => {
        setActiveMenu(null)
        setIsClosing(false)
      }, 150) // Match animation duration
    }, 80)
  }, [])

  const handleCopy = useCallback((key: string, action: () => void) => {
    action()
    setCopyState(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopyState(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }, [])

  const imageSections: MenuSection[] = [
    {
      icon: <Copy className="h-3.5 w-3.5" />,
      title: 'Copy to Clipboard',
      items: [
        {
          icon: <FileImage className="h-4 w-4 text-blue-500" />,
          label: 'Copy PNG Image',
          onClick: () => handleCopy('png-copy', onCopyPNG),
          showCheck: copyState['png-copy'],
        },
      ],
    },
    {
      icon: <Download className="h-3.5 w-3.5" />,
      title: 'Download File',
      items: [
        {
          icon: <FileImage className="h-4 w-4 text-blue-500" />,
          label: 'PNG Format',
          suffix: 'Transparent',
          onClick: onDownloadPNG,
        },
        {
          icon: <FileImage className="h-4 w-4 text-orange-500" />,
          label: 'JPG Format',
          suffix: 'White BG',
          onClick: onDownloadJPG,
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: 'SVG Format',
          suffix: 'Vector',
          onClick: onDownloadSVG,
        },
      ],
    },
  ]

  const codeSections: MenuSection[] = [
    {
      icon: <Copy className="h-3.5 w-3.5" />,
      title: 'Copy to Clipboard',
      items: [
        {
          icon: <FileCode className="h-4 w-4 text-cyan-500" />,
          label: 'Typst Code',
          onClick: () => handleCopy('typst-copy', onCopyTypst),
          showCheck: copyState['typst-copy'],
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: 'SVG Code',
          onClick: () => handleCopy('svg-copy', onCopySVG),
          showCheck: copyState['svg-copy'],
        },
        {
          icon: <Globe className="h-4 w-4 text-orange-500" />,
          label: 'HTML Code',
          onClick: () => handleCopy('html-copy', onCopyHTML),
          showCheck: copyState['html-copy'],
        },
      ],
    },
    {
      icon: <Download className="h-3.5 w-3.5" />,
      title: 'Download File',
      items: [
        {
          icon: <FileCode className="h-4 w-4 text-cyan-500" />,
          label: 'Typst File',
          suffix: '.typ',
          onClick: onDownloadTypst,
        },
        {
          icon: <FileType className="h-4 w-4 text-purple-500" />,
          label: 'SVG File',
          suffix: '.svg',
          onClick: onDownloadSVG,
        },
        {
          icon: <Globe className="h-4 w-4 text-orange-500" />,
          label: 'HTML File',
          suffix: '.html',
          onClick: onDownloadHTML,
        },
      ],
    },
  ]

  return (
    <MenuContext.Provider value={{ activeMenu, isClosing, openMenu, closeMenu }}>
      <div className="flex items-center gap-2">
        {/* Export Image */}
        <HoverMenu
          menuId="image"
          disabled={isDisabled}
          sections={imageSections}
          trigger={
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="gap-2 transition-all duration-200 hover:shadow-md"
            >
              <Image className="h-4 w-4" />
              Export Image
            </Button>
          }
        />

        {/* Export Code */}
        <HoverMenu
          menuId="code"
          disabled={isDisabled}
          sections={codeSections}
          trigger={
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="gap-2 transition-all duration-200 hover:shadow-md"
            >
              <Code className="h-4 w-4" />
              Export Code
            </Button>
          }
        />

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
          {copyState['share'] ? 'Copied' : 'Share'}
          <Link className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </MenuContext.Provider>
  )
}
