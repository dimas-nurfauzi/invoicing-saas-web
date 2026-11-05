import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
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
import { useVoidInvoice } from './api'
import { voidSchema, type VoidForm } from './schemas'
import type { Invoice } from './types'

interface VoidDialogProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** ADMIN only (the backend enforces it). The number stays used, so the sequence has no gaps. */
export function VoidDialog({ invoice, open, onOpenChange }: VoidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void {invoice.invoiceNumber}?</DialogTitle>
          <DialogDescription>
            A voided invoice can&apos;t be paid or changed, and its number isn&apos;t reused. This
            can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {open && <VoidFormBody invoice={invoice} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function VoidFormBody({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const voidInvoice = useVoidInvoice(invoice.id!)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoidForm>({ resolver: zodResolver(voidSchema), defaultValues: { reason: '' } })

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={handleSubmit(({ reason }) =>
        voidInvoice.mutate(reason.trim(), {
          onSuccess: () => {
            toast.success(`${invoice.invoiceNumber} voided`)
            onDone()
          },
        }),
      )}
    >
      <FormField
        id="void-reason"
        label="Reason"
        placeholder="Issued to the wrong customer"
        error={errors.reason?.message}
        {...register('reason')}
      />
      {voidInvoice.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(voidInvoice.error)}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={voidInvoice.isPending}>
          {voidInvoice.isPending ? 'Voiding…' : 'Void invoice'}
        </Button>
      </DialogFooter>
    </form>
  )
}
