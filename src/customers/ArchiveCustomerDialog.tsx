import { toast } from 'sonner'
import type { Schemas } from '@/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { errorMessage } from '@/lib/errors'
import { useSetArchived } from './api'

interface ArchiveCustomerDialogProps {
  customer: Schemas['CustomerResponse'] | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

/** Confirmation before archiving. Archiving is a soft delete: the customer can be restored. */
export function ArchiveCustomerDialog({
  customer,
  onOpenChange,
  onArchived,
}: ArchiveCustomerDialogProps) {
  const archive = useSetArchived()

  const confirm = () => {
    if (!customer?.id) return
    archive.mutate(
      { id: customer.id, archived: true },
      {
        onSuccess: () => {
          toast.success(`Archived ${customer.name}`)
          onOpenChange(false)
          onArchived?.()
        },
      },
    )
  }

  return (
    <Dialog
      open={customer !== null}
      onOpenChange={(open) => {
        if (!open) archive.reset()
        onOpenChange(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {customer?.name}?</DialogTitle>
          <DialogDescription>
            Archived customers are hidden from the list and can&apos;t get new invoices. Existing
            invoices keep them. You can restore them later.
          </DialogDescription>
        </DialogHeader>
        {archive.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(archive.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={archive.isPending} onClick={confirm}>
            {archive.isPending ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
