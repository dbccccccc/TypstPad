import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type MenuGroupContextValue = {
  activeMenu: string | null
  isClosing: boolean
  openMenu: (id: string) => void
  closeMenu: () => void
}

const MenuGroupContext = React.createContext<MenuGroupContextValue | null>(null)

interface MenuGroupProviderProps {
  children: React.ReactNode
  closeDelay?: number
  closeDuration?: number
}

function MenuGroupProvider({
  children,
  closeDelay = 80,
  closeDuration = 150,
}: MenuGroupProviderProps) {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null)
  const [isClosing, setIsClosing] = React.useState(false)
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>()
  const closingAnimationRef = React.useRef<ReturnType<typeof setTimeout>>()

  React.useEffect(() => {
    return () => {
      clearTimeout(closeTimeoutRef.current)
      clearTimeout(closingAnimationRef.current)
    }
  }, [])

  const openMenu = React.useCallback((id: string) => {
    clearTimeout(closeTimeoutRef.current)
    clearTimeout(closingAnimationRef.current)
    setIsClosing(false)
    setActiveMenu(id)
  }, [])

  const closeMenu = React.useCallback(() => {
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(true)
      closingAnimationRef.current = setTimeout(() => {
        setActiveMenu(null)
        setIsClosing(false)
      }, closeDuration)
    }, closeDelay)
  }, [closeDelay, closeDuration])

  const value = React.useMemo(
    () => ({
      activeMenu,
      isClosing,
      openMenu,
      closeMenu,
    }),
    [activeMenu, isClosing, openMenu, closeMenu]
  )

  return (
    <MenuGroupContext.Provider value={value}>
      {children}
    </MenuGroupContext.Provider>
  )
}

function useMenuGroup() {
  const context = React.useContext(MenuGroupContext)
  if (!context) {
    throw new Error("FloatingMenu must be used within MenuGroupProvider")
  }
  return context
}

type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end"

type FloatingMenuTriggerProps = {
  onClick: (event: React.MouseEvent) => void
  "aria-expanded": boolean
  "aria-haspopup": "menu"
}

type FloatingMenuTriggerRenderProps = {
  isOpen: boolean
  triggerProps: FloatingMenuTriggerProps
}

interface FloatingMenuProps {
  menuId: string
  trigger: React.ReactElement | ((props: FloatingMenuTriggerRenderProps) => React.ReactNode)
  children: React.ReactNode
  placement?: MenuPlacement
  offset?: number
  collisionPadding?: number
  openOnHover?: boolean
  disabled?: boolean
  containerClassName?: string
  contentClassName?: string
  contentStyle?: React.CSSProperties
  portal?: boolean
}

function FloatingMenu({
  menuId,
  trigger,
  children,
  placement = "bottom-start",
  offset = 4,
  collisionPadding = 8,
  openOnHover = true,
  disabled = false,
  containerClassName,
  contentClassName,
  contentStyle,
  portal = true,
}: FloatingMenuProps) {
  const { activeMenu, isClosing, openMenu, closeMenu } = useMenuGroup()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const openedByClickRef = React.useRef(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  const isOpen = activeMenu === menuId

  const updatePosition = React.useCallback(() => {
    if (!containerRef.current || typeof window === "undefined") return

    const rect = containerRef.current.getBoundingClientRect()
    const menuRect = menuRef.current?.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = menuRect?.width ?? 0
    const menuHeight = menuRect?.height ?? 0
    const isBottom = placement.startsWith("bottom")
    const isStart = placement.endsWith("start")

    let top = isBottom ? rect.bottom + offset : rect.top - menuHeight - offset
    let left = isStart ? rect.left : rect.right - menuWidth

    if (menuRect) {
      if (isBottom && top + menuHeight > viewportHeight - collisionPadding) {
        const flippedTop = rect.top - menuHeight - offset
        if (flippedTop >= collisionPadding) {
          top = flippedTop
        }
      } else if (!isBottom && top < collisionPadding) {
        const flippedTop = rect.bottom + offset
        if (flippedTop + menuHeight <= viewportHeight - collisionPadding) {
          top = flippedTop
        }
      }

      left = Math.min(
        Math.max(left, collisionPadding),
        viewportWidth - menuWidth - collisionPadding
      )
      top = Math.min(
        Math.max(top, collisionPadding),
        viewportHeight - menuHeight - collisionPadding
      )
    }

    setPosition({ top, left })
  }, [placement, offset, collisionPadding])

  React.useLayoutEffect(() => {
    if (!isOpen) return
    updatePosition()
    if (typeof window === "undefined") return
    const frame = window.requestAnimationFrame(updatePosition)
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, updatePosition])

  React.useEffect(() => {
    if (!isOpen || typeof window === "undefined") return

    const handleViewportChange = () => updatePosition()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [isOpen, updatePosition])

  const handleTriggerClick = React.useCallback((event: React.MouseEvent) => {
    if (event.defaultPrevented) return
    if (disabled) return
    if (isOpen) {
      if (!openedByClickRef.current) return
      openedByClickRef.current = false
      closeMenu()
      return
    }
    openedByClickRef.current = true
    openMenu(menuId)
  }, [isOpen, closeMenu, openMenu, menuId])

  const handleMouseEnter = React.useCallback(() => {
    if (!openOnHover || disabled) return
    openedByClickRef.current = false
    openMenu(menuId)
  }, [menuId, openMenu, openOnHover, disabled])

  const handleMouseLeave = React.useCallback(() => {
    if (!openOnHover) return
    openedByClickRef.current = false
    closeMenu()
  }, [closeMenu, openOnHover])

  React.useEffect(() => {
    if (!disabled || !isOpen) return
    openedByClickRef.current = false
    closeMenu()
  }, [disabled, isOpen, closeMenu])

  React.useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      openedByClickRef.current = false
      closeMenu()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [isOpen, closeMenu])

  const triggerProps: FloatingMenuTriggerProps = {
    onClick: handleTriggerClick,
    "aria-expanded": isOpen,
    "aria-haspopup": "menu",
  }

  const triggerElement = typeof trigger === "function"
    ? trigger({ isOpen, triggerProps })
    : React.isValidElement(trigger)
      ? React.cloneElement(trigger, {
        ...triggerProps,
        onClick: (event: React.MouseEvent) => {
          trigger.props.onClick?.(event)
          if (event.defaultPrevented) return
          handleTriggerClick(event)
        },
      })
      : trigger

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "fixed z-[9999] rounded-md border bg-popover text-popover-foreground shadow-md",
        isClosing ? "animate-menu-hide" : "animate-menu-show",
        contentClassName
      )}
      style={{ top: position.top, left: position.left, ...contentStyle }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )

  const shouldPortal = portal && typeof document !== "undefined"

  return (
    <div
      ref={containerRef}
      className={cn("relative", containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {triggerElement}
      {isOpen && (shouldPortal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  )
}

export {
  FloatingMenu,
  MenuGroupProvider,
  useMenuGroup,
}
