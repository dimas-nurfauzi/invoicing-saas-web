import { Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useInvoices } from '@/invoices/api'
import { StatusBadge } from '@/invoices/StatusBadge'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/invoices/types'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

export function InvoicesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const statusParam = params.get('status')
  const status = INVOICE_STATUSES.includes(statusParam as InvoiceStatus)
    ? (statusParam as InvoiceStatus)
    : undefined
  const page = Math.max(0, (Number.parseInt(params.get('page') ?? '1', 10) || 1) - 1)
  const invoices = useInvoices({ status, page })

  const setFilter = (next: { status?: InvoiceStatus; page?: number }) => {
    const p = new URLSearchParams()
    const s = 'status' in next ? next.status : status
    if (s) p.set('status', s)
    if (next.page) p.set('page', String(next.page + 1))
    setParams(p)
  }

  const rows = invoices.data?.content ?? []

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Drafts, issued and paid invoices.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/ai-draft">
              <Sparkles /> AI draft
            </Link>
          </Button>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        </div>
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
        {[undefined, ...INVOICE_STATUSES].map((s) => (
          <button
            key={s ?? 'ALL'}
            type="button"
            aria-pressed={status === s}
            onClick={() => setFilter({ status: s, page: 0 })}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground',
              status === s && 'bg-background text-foreground shadow-sm ring-1 ring-border',
            )}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
          </button>
        ))}
      </div>

      {invoices.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : invoices.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(invoices.error)}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            {page > 0 ? (
              <Button variant="outline" onClick={() => setFilter({ page: 0 })}>
                Nothing on this page. Back to the first page
              </Button>
            ) : status ? (
              `No ${status.toLowerCase()} invoices.`
            ) : (
              <>
                <span>No invoices yet.</span>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to="/ai-draft">
                      <Sparkles /> Draft one with AI
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/invoices/new">
                      <Plus /> New invoice
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-4 text-right">Balance due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <TableCell className="pl-4 font-medium">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inv.invoiceNumber ?? 'Draft'}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.customer?.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell>{formatDate(inv.issueDate)}</TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(inv.total, inv.currency ?? '')}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    {formatMoney(inv.balanceDue, inv.currency ?? '')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {invoices.data && (
        <Pagination
          page={invoices.data.page ?? page}
          size={invoices.data.size ?? 20}
          totalElements={invoices.data.totalElements ?? 0}
          totalPages={invoices.data.totalPages ?? 0}
          onPageChange={(p) => setFilter({ page: p })}
        />
      )}
    </div>
  )
}
