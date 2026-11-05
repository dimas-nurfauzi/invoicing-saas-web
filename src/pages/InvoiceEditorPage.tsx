import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoice, useSaveInvoice } from '@/invoices/api'
import { InvoiceForm } from '@/invoices/InvoiceForm'
import { newInvoiceDefaults } from '@/invoices/defaults'
import type { InvoiceForm as InvoiceFormValues } from '@/invoices/schemas'
import type { Invoice } from '@/invoices/types'
import { errorMessage } from '@/lib/errors'

function fromInvoice(invoice: Invoice): InvoiceFormValues {
  return {
    customerId: invoice.customer?.id ?? '',
    currency: invoice.currency ?? 'IDR',
    issueDate: invoice.issueDate ?? '',
    dueDate: invoice.dueDate ?? '',
    notes: invoice.notes ?? '',
    lines: (invoice.lines ?? []).map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? '',
      unitPrice: line.unitPrice ?? '',
      discountPercent: line.discountPercent ?? '',
      taxRatePercent: line.taxRatePercent ?? '',
    })),
  }
}

/** /invoices/new */
export function NewInvoicePage() {
  const navigate = useNavigate()
  const save = useSaveInvoice()
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Saved as a draft. You can still change it until you issue it.
        </p>
      </div>
      <InvoiceForm
        defaultValues={newInvoiceDefaults()}
        submitLabel="Save draft"
        pending={save.isPending}
        error={save.error}
        onCancel={() => navigate('/invoices')}
        onSubmit={(body) =>
          save.mutate(body, {
            onSuccess: (invoice) => {
              toast.success('Draft saved')
              navigate(`/invoices/${invoice.id}`)
            },
          })
        }
      />
    </div>
  )
}

/** /invoices/:id/edit (drafts only) */
export function EditInvoicePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const invoice = useInvoice(id)
  const save = useSaveInvoice(id)

  if (invoice.isPending) return <Skeleton className="h-96 w-full" />
  if (invoice.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(invoice.error)}</AlertDescription>
      </Alert>
    )
  }
  if (invoice.data.status !== 'DRAFT') {
    return (
      <Alert>
        <AlertDescription>
          Only drafts can be edited. This invoice is {invoice.data.status}.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Edit draft</h1>
      <InvoiceForm
        defaultValues={fromInvoice(invoice.data)}
        currentCustomer={invoice.data.customer}
        submitLabel="Save draft"
        pending={save.isPending}
        error={save.error}
        onCancel={() => navigate(`/invoices/${id}`)}
        onSubmit={(body) =>
          save.mutate(body, {
            onSuccess: () => {
              toast.success('Draft saved')
              navigate(`/invoices/${id}`)
            },
          })
        }
      />
    </div>
  )
}
