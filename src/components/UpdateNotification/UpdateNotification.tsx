import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { snoozeUpdate } from '@/hooks/useVersionCheck'

interface UpdateNotificationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
  newVersion: string
}

export function UpdateNotification({
  open,
  onOpenChange,
  currentVersion,
  newVersion
}: UpdateNotificationProps) {
  const handleUpdate = () => {
    window.location.reload()
  }

  const handleSnooze = () => {
    snoozeUpdate()
    onOpenChange(false)
  }

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      onOpenChange(false)
    }, 60000)

    return () => clearTimeout(timer)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            New Version Available
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            New version <strong>v{newVersion}</strong> is available
          </p>
          <p className="text-xs text-muted-foreground">
            Current version: v{currentVersion}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSnooze}>
            Remind Later
          </Button>
          <Button onClick={handleUpdate}>
            Update Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
