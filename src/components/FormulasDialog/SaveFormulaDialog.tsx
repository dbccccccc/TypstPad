import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Bookmark } from 'lucide-react'

interface SaveFormulaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
}

function SaveFormulaDialog({ open, onOpenChange, onSave }: SaveFormulaDialogProps) {
  const [name, setName] = useState('')

  const handleSave = () => {
    onSave(name)
    setName('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Save Formula
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="save-formula-name">Name (optional)</Label>
            <input
              id="save-formula-name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter a name for this formula"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveFormulaDialog
