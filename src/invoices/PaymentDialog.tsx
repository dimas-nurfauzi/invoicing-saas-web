import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { NativeSelect } from '@/components/NativeSelect'
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
import { Label } from '@/components/ui/label'
import { todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { useRecordPayment } from './api'
import { paymentSchema, type PaymentForm } from './schemas'
import { PAYMENT_METHODS, type Invoice } from './types'

interface PaymentDialogProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDialog({ invoice, open, onOpenChange }: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Balance due: {formatMoney(invoice.balanceDue, invoice.currency ?? '')}. Partial payments
            are fine; the invoice becomes PAID when the balance reaches zero.
          </DialogDescription>
        </DialogHeader>
        {open && <PaymentFormBody invoice={invoice} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentFormBody({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const record = useRecordPayment(invoice.id!)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: invoice.balanceDue ?? '',
      paidOn: todayIso(),
      method: 'BANK_TRANSFER',
      reference: '',
      note: '',
    },
  })

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={handleSubmit((values) =>
        record.mutate(values, {
          onSuccess: ({ invoice: updated }) => {
            toast.success(
              updated?.status === 'PAID' ? 'Payment recorded. Invoice paid.' : 'Payment recorded',
            )
            onDone()
          },
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="payment-amount"
          label={`Amount (${invoice.currency})`}
          inputMode="decimal"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <FormField
          id="payment-date"
          label="Paid on"
          type="date"
          max={todayIso()}
          error={errors.paidOn?.message}
          {...register('paidOn')}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="payment-method">Method</Label>
        <NativeSelect id="payment-method" {...register('method')}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <FormField
        id="payment-reference"
        label="Reference"
        placeholder="Transfer ID, receipt number…"
        error={errors.reference?.message}
        {...register('reference')}
      />
      <FormField
        id="payment-note"
        label="Note"
        error={errors.note?.message}
        {...register('note')}
      />
      {record.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(record.error)}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={record.isPending}>
          {record.isPending ? 'Recording…' : 'Record payment'}
        </Button>
      </DialogFooter>
    </form>
  )
}
