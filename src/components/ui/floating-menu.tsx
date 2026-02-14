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
type VerticalPlacement = "top" | "bottom"

type FloatingMenuTriggerProps = {
  onClick: React.MouseEventHandler<HTMLElement>
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
  closeOnSelect?: boolean
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
  closeOnSelect = false,
  disabled = false,
  containerClassName,
  contentClassName,
  contentStyle,
  portal = true,
}: FloatingMenuProps) {
  const { activeMenu, isClosing, openMenu, closeMenu } = useMenuGroup()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const viewportFrameRef = React.useRef<number | null>(null)
  const openedByClickRef = React.useRef(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [supportsHover, setSupportsHover] = React.useState(true)

  const isOpen = activeMenu === menuId
  const isBottomPlacement = placement.startsWith("bottom")
  const isStartPlacement = placement.endsWith("start")
  const [resolvedVerticalPlacement, setResolvedVerticalPlacement] = React.useState<VerticalPlacement>(
    isBottomPlacement ? "bottom" : "top"
  )

  const hoverEnabled = openOnHover && supportsHover
  const animationClass = isClosing
    ? (resolvedVerticalPlacement === "bottom" ? "animate-menu-hide-bottom" : "animate-menu-hide-top")
    : (resolvedVerticalPlacement === "bottom" ? "animate-menu-show-bottom" : "animate-menu-show-top")
  const transformOrigin = `${resolvedVerticalPlacement === "bottom" ? "top" : "bottom"} ${isStartPlacement ? "left" : "right"}`

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)")
    const updateSupportsHover = () => setSupportsHover(mediaQuery.matches)

    updateSupportsHover()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateSupportsHover)
      return () => mediaQuery.removeEventListener("change", updateSupportsHover)
    }

    mediaQuery.addListener(updateSupportsHover)
    return () => mediaQuery.removeListener(updateSupportsHover)
  }, [])

  React.useEffect(() => {
    setResolvedVerticalPlacement(isBottomPlacement ? "bottom" : "top")
  }, [isBottomPlacement])

  const updatePosition = React.useCallback(() => {
    if (!containerRef.current || !menuRef.current || typeof window === "undefined") return

    const rect = containerRef.current.getBoundingClientRect()
    const menuEl = menuRef.current
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = menuEl.offsetWidth
    const menuHeight = menuEl.offsetHeight

    let resolvedVertical: VerticalPlacement = isBottomPlacement ? "bottom" : "top"
    let top = isBottomPlacement ? rect.bottom + offset : rect.top - menuHeight - offset
    let left = isStartPlacement ? rect.left : rect.right - menuWidth

    if (isBottomPlacement && top + menuHeight > viewportHeight - collisionPadding) {
      const flippedTop = rect.top - menuHeight - offset
      if (flippedTop >= collisionPadding) {
        top = flippedTop
        resolvedVertical = "top"
      }
    } else if (!isBottomPlacement && top < collisionPadding) {
      const flippedTop = rect.bottom + offset
      if (flippedTop + menuHeight <= viewportHeight - collisionPadding) {
        top = flippedTop
        resolvedVertical = "bottom"
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

    setPosition({ top, left })
    setResolvedVerticalPlacement((prev) => (prev === resolvedVertical ? prev : resolvedVertical))
  }, [collisionPadding, isBottomPlacement, isStartPlacement, offset])

  React.useEffect(() => {
    return () => {
      if (viewportFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(viewportFrameRef.current)
      }
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!isOpen) return
    updatePosition()
    if (typeof window === "undefined") return
    const frame = window.requestAnimationFrame(updatePosition)
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, updatePosition])

  React.useEffect(() => {
    if (!isOpen || typeof window === "undefined") return

    const scheduleUpdate = () => {
      if (viewportFrameRef.current !== null) return
      viewportFrameRef.current = window.requestAnimationFrame(() => {
        viewportFrameRef.current = null
        updatePosition()
      })
    }

    window.addEventListener("resize", scheduleUpdate)
    window.addEventListener("scroll", scheduleUpdate, true)

    return () => {
      window.removeEventListener("resize", scheduleUpdate)
      window.removeEventListener("scroll", scheduleUpdate, true)
      if (viewportFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportFrameRef.current)
        viewportFrameRef.current = null
      }
    }
  }, [isOpen, updatePosition])

  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      openedByClickRef.current = false
      closeMenu()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [closeMenu, isOpen])

  React.useEffect(() => {
    if (!isOpen || !openedByClickRef.current || typeof window === "undefined") return

    const frame = window.requestAnimationFrame(() => {
      const root = menuRef.current
      if (!root) return
      const firstFocusable = root.querySelector<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  const handleTriggerClick = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
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
  }, [isOpen, closeMenu, openMenu, menuId, disabled])

  const handleMenuClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnSelect) return

    const target = event.target as HTMLElement | null
    if (!target) return

    const actionable = target.closest<HTMLElement>(
      'button,[role="menuitem"],a[href],[data-menu-close="true"]'
    )

    if (!actionable || !menuRef.current?.contains(actionable)) return
    if (actionable instanceof HTMLButtonElement && actionable.disabled) return

    openedByClickRef.current = false
    closeMenu()
  }, [closeOnSelect, closeMenu])

  const handleMouseEnter = React.useCallback(() => {
    if (!hoverEnabled || disabled) return
    openedByClickRef.current = false
    openMenu(menuId)
  }, [menuId, openMenu, hoverEnabled, disabled])

  const handleMouseLeave = React.useCallback(() => {
    if (!hoverEnabled) return
    openedByClickRef.current = false
    closeMenu()
  }, [closeMenu, hoverEnabled])

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
    : React.isValidElement<React.HTMLAttributes<HTMLElement>>(trigger)
      ? React.cloneElement(trigger, {
        ...triggerProps,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
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
      tabIndex={-1}
      className={cn(
        "fixed z-[9999] rounded-md border bg-popover text-popover-foreground shadow-md",
        animationClass,
        contentClassName
      )}
      style={{ top: position.top, left: position.left, transformOrigin, ...contentStyle }}
      onClick={handleMenuClick}
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
