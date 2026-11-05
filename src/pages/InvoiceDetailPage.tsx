import { ArrowLeft, Ban, Pencil, Send, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/auth/useMe'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeleteDraft, useInvoice, useIssueInvoice, usePayments } from '@/invoices/api'
import { PaymentDialog } from '@/invoices/PaymentDialog'
import { StatusBadge } from '@/invoices/StatusBadge'
import { PAYMENT_METHODS, type Invoice, type InvoiceLineView } from '@/invoices/types'
import { VoidDialog } from '@/invoices/VoidDialog'
import { formatDate, formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { toInputDecimal } from '@/lib/number-utils'

type DialogName = 'issue' | 'delete' | 'pay' | 'void' | null

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const invoice = useInvoice(id)

  if (invoice.isPending) return <Skeleton className="h-96 w-full" />
  if (invoice.isError) {
    return (
      <div className="grid gap-4">
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(invoice.error)}</AlertDescription>
        </Alert>
      </div>
    )
  }
  return <InvoiceView invoice={invoice.data} />
}

function BackLink() {
  return (
    <Link
      to="/invoices"
      className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Invoices
    </Link>
  )
}

function InvoiceView({ invoice }: { invoice: Invoice }) {
  const id = invoice.id!
  const navigate = useNavigate()
  const isAdmin = useMe().data?.role === 'ADMIN'
  const [dialog, setDialog] = useState<DialogName>(null)
  const issue = useIssueInvoice(id)
  const remove = useDeleteDraft(id)
  const isDraft = invoice.status === 'DRAFT'
  const payable = invoice.status === 'SENT' || invoice.status === 'OVERDUE'
  const payments = usePayments(id, !isDraft)
  const currency = invoice.currency ?? ''
  const money = (amount?: string) => formatMoney(amount, currency)
  const lines = (invoice.lines ?? []) as InvoiceLineView[]

  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialog(null)
      issue.reset()
      remove.reset()
    }
  }

  return (
    <div className="grid gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{invoice.invoiceNumber ?? 'Draft invoice'}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">{invoice.customer?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => setDialog('delete')}>
                <Trash2 /> Delete
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/invoices/${id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <Button onClick={() => setDialog('issue')}>
                <Send /> Issue
              </Button>
            </>
          )}
          {payable && isAdmin && (
            <Button variant="outline" onClick={() => setDialog('void')}>
              <Ban /> Void
            </Button>
          )}
          {payable && (
            <Button onClick={() => setDialog('pay')}>
              <Wallet /> Record payment
            </Button>
          )}
        </div>
      </div>

      {invoice.status === 'VOID' && (
        <Alert>
          <AlertDescription>
            Voided {formatDateTime(invoice.voidedAt)}: {invoice.voidReason}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Bill to">
            {invoice.billTo ? (
              <>
                <div className="font-medium">{invoice.billTo.name}</div>
                {invoice.billTo.email && <div>{invoice.billTo.email}</div>}
                {invoice.billTo.address && (
                  <div className="whitespace-pre-line">{invoice.billTo.address}</div>
                )}
                {invoice.billTo.taxId && <div>Tax ID {invoice.billTo.taxId}</div>}
              </>
            ) : (
              <>
                <div className="font-medium">{invoice.customer?.name}</div>
                <div className="text-muted-foreground">Details are copied when issued.</div>
              </>
            )}
          </Info>
          <Info label="Issue date">{formatDate(invoice.issueDate)}</Info>
          <Info label="Due date">{formatDate(invoice.dueDate)}</Info>
          <Info label="Balance due">
            <span className="text-lg font-semibold">{money(invoice.balanceDue)}</span>
            {invoice.paidAt && (
              <div className="text-muted-foreground">Paid {formatDateTime(invoice.paidAt)}</div>
            )}
          </Info>
        </CardContent>
      </Card>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Disc.</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="pr-4 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, i) => (
              <TableRow key={line.lineNo ?? i}>
                <TableCell className="pl-4 whitespace-normal">{line.description}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {toInputDecimal(line.quantity, { trimZeros: true })}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(line.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {percent(line.discountPercent)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {percent(line.taxRatePercent)}
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">{money(line.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            {[
              ['Subtotal', invoice.subtotal],
              [
                'Discount',
                invoice.discountTotal && !/^0+(\.0+)?$/.test(invoice.discountTotal)
                  ? `-${invoice.discountTotal}`
                  : invoice.discountTotal,
              ],
              ['Tax', invoice.taxTotal],
              ['Total', invoice.total],
              ['Paid', invoice.amountPaid],
              ['Balance due', invoice.balanceDue],
            ].map(([label, value]) => (
              <TableRow key={label}>
                <TableCell colSpan={5} className="pl-4 text-right">
                  {label}
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">
                  {value?.startsWith('-') ? `-${money(value.slice(1))}` : money(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableFooter>
        </Table>
      </Card>

      {!isDraft && (
        <Card className="pb-0">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          {payments.isPending ? (
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          ) : payments.isError ? (
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>{errorMessage(payments.error)}</AlertDescription>
              </Alert>
            </CardContent>
          ) : payments.data.length === 0 ? (
            <CardContent className="pb-6 text-sm text-muted-foreground">
              No payments yet.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Paid on</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4">{formatDate(p.paidOn)}</TableCell>
                    <TableCell>
                      {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                    </TableCell>
                    <TableCell>{p.reference}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {money(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line">{invoice.notes}</CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={dialog === 'issue'}
        onOpenChange={closeDialog}
        title="Issue this invoice?"
        description="It gets the next invoice number, the customer's details are copied onto it, and it can no longer be edited."
        confirmLabel="Issue"
        pendingLabel="Issuing…"
        pending={issue.isPending}
        error={issue.isError ? errorMessage(issue.error) : null}
        onConfirm={() =>
          issue.mutate(undefined, {
            onSuccess: (issued) => {
              toast.success(`Issued ${issued.invoiceNumber}`)
              setDialog(null)
            },
          })
        }
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={closeDialog}
        title="Delete this draft?"
        description="Drafts have no number yet, so deleting one leaves no gap. This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        pending={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success('Draft deleted')
              navigate('/invoices', { replace: true })
            },
          })
        }
      />
      <PaymentDialog invoice={invoice} open={dialog === 'pay'} onOpenChange={closeDialog} />
      <VoidDialog invoice={invoice} open={dialog === 'void'} onOpenChange={closeDialog} />
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function percent(value?: string) {
  if (!value || /^0+(\.0+)?$/.test(value)) return '—'
  return `${toInputDecimal(value, { trimZeros: true })}%`
}
