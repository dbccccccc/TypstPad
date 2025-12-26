import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Custom Dialog with animation support
interface AnimatedDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogAnimationContext = React.createContext<{
  isClosing: boolean
}>({ isClosing: false })

function Dialog({ open, onOpenChange, children }: AnimatedDialogProps) {
  // isRendered controls whether DOM exists, isClosing controls animation direction
  const [isRendered, setIsRendered] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const animationTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>()
  const prevOpenRef = React.useRef(false)

  React.useEffect(() => {
    const wasOpen = prevOpenRef.current
    const isOpen = open ?? false
    prevOpenRef.current = isOpen

    clearTimeout(animationTimeoutRef.current)

    if (isOpen && !wasOpen) {
      // Opening
      setIsRendered(true)
      setIsClosing(false)
    } else if (!isOpen && wasOpen && isRendered) {
      // Closing - start animation
      setIsClosing(true)
      animationTimeoutRef.current = setTimeout(() => {
        setIsRendered(false)
        setIsClosing(false)
      }, 150)
    }
  }, [open, isRendered])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => clearTimeout(animationTimeoutRef.current)
  }, [])

  // Handle close requests from Radix (clicking overlay, pressing Escape, X button)
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen && !isClosing) {
      onOpenChange?.(false)
    }
  }, [isClosing, onOpenChange])

  const contextValue = React.useMemo(
    () => ({ isClosing }),
    [isClosing]
  )

  // Don't render if not needed
  if (!isRendered) {
    return null
  }

  return (
    <DialogAnimationContext.Provider value={contextValue}>
      <DialogPrimitive.Root open={true} onOpenChange={handleOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </DialogAnimationContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const { isClosing } = React.useContext(DialogAnimationContext)

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/80",
        isClosing ? "animate-overlay-hide" : "animate-overlay-show",
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { isClosing } = React.useContext(DialogAnimationContext)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
          isClosing ? "animate-dialog-hide" : "animate-dialog-show",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
