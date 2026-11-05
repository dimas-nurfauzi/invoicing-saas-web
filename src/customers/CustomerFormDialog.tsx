import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { Schemas } from '@/api/client'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { useSaveCustomer } from './api'
import { customerSchema, EMPTY_CUSTOMER, type CustomerForm } from './schemas'

type Customer = Schemas['CustomerResponse']

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this customer; omit to add a new one. */
  customer?: Customer
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>
            Only the name is required. Invoices show these details as the bill-to.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so the form starts fresh for each customer. */}
        <CustomerFormBody
          key={customer?.id ?? 'new'}
          customer={customer}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function toForm(customer?: Customer): CustomerForm {
  if (!customer) return EMPTY_CUSTOMER
  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    billingAddress: customer.billingAddress ?? '',
    taxId: customer.taxId ?? '',
  }
}

function CustomerFormBody({ customer, onDone }: { customer?: Customer; onDone: () => void }) {
  const save = useSaveCustomer(customer?.id)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: toForm(customer),
  })

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: (saved) => {
        toast.success(customer ? `Saved ${saved.name}` : `Added ${saved.name}`)
        onDone()
      },
    }),
  )

  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <FormField
        id="customer-name"
        label="Name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-email"
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          id="customer-phone"
          label="Phone"
          type="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="customer-address">Billing address</Label>
        <Textarea
          id="customer-address"
          rows={3}
          aria-invalid={errors.billingAddress ? true : undefined}
          aria-describedby={errors.billingAddress ? 'customer-address-error' : undefined}
          {...register('billingAddress')}
        />
        {errors.billingAddress && (
          <p id="customer-address-error" className="text-sm text-destructive">
            {errors.billingAddress.message}
          </p>
        )}
      </div>
      <FormField
        id="customer-tax-id"
        label="Tax ID"
        hint="E.g. NPWP."
        error={errors.taxId?.message}
        {...register('taxId')}
      />
      {save.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(save.error)}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : customer ? 'Save' : 'Add customer'}
        </Button>
      </DialogFooter>
    </form>
  )
}
