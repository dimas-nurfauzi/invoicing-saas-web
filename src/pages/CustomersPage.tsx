import { Archive, ArchiveRestore, Pencil, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import type { Schemas } from '@/api/client'
import { useMe } from '@/auth/useMe'
import { Pagination } from '@/components/Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArchiveCustomerDialog } from '@/customers/ArchiveCustomerDialog'
import { CustomerFormDialog } from '@/customers/CustomerFormDialog'
import { useCustomers, useSetArchived } from '@/customers/api'
import { errorMessage } from '@/lib/errors'

type Customer = Schemas['CustomerResponse']
type FormState = { open: false } | { open: true; customer?: Customer }

/** URL holds q, page (1-based for people) and archived=1, so reload and back keep the view. */
function useListParams() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(0, (Number.parseInt(params.get('page') ?? '1', 10) || 1) - 1)
  const includeArchived = params.get('archived') === '1'

  const update = (next: { q?: string; page?: number; includeArchived?: boolean }) =>
    setParams(
      (current) => {
        const p = new URLSearchParams(current)
        const set = (key: string, value: string | null) =>
          value ? p.set(key, value) : p.delete(key)
        if (next.q !== undefined) set('q', next.q.trim() || null)
        if (next.includeArchived !== undefined) set('archived', next.includeArchived ? '1' : null)
        // Any filter change goes back to the first page.
        const page = next.page ?? 0
        set('page', page > 0 ? String(page + 1) : null)
        return p
      },
      { replace: next.page === undefined },
    )

  return { q, page, includeArchived, update }
}

export function CustomersPage() {
  const { q, page, includeArchived, update } = useListParams()
  const [search, setSearch] = useState(q)
  const [shownQ, setShownQ] = useState(q)
  const searchTimer = useRef<number | undefined>(undefined)
  const [form, setForm] = useState<FormState>({ open: false })
  const [archiving, setArchiving] = useState<Customer | null>(null)
  const restore = useSetArchived()
  const isAdmin = useMe().data?.role === 'ADMIN'

  const customers = useCustomers({ q, page, includeArchived })

  // Back/forward changed q in the URL: show it in the box (adjusting state during render, as
  // React recommends, instead of an effect). Trailing spaces the user is typing stay.
  if (q !== shownQ) {
    setShownQ(q)
    if (search.trim() !== q) setSearch(q)
  }

  // Typing updates the URL (and so the query) once the user pauses for 300 ms.
  const onSearchChange = (value: string) => {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ q: value }), 300)
  }
  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  const onRestore = (customer: Customer) =>
    restore.mutate(
      { id: customer.id!, archived: false },
      {
        onSuccess: () => toast.success(`Restored ${customer.name}`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  const rows = customers.data?.content ?? []
  const filtering = q !== '' || includeArchived

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">Who you bill.</p>
        </div>
        <Button onClick={() => setForm({ open: true })}>
          <Plus /> Add customer
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search customers"
            placeholder="Search name or email"
            className="pl-8"
            maxLength={100}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={includeArchived}
            onChange={(e) => update({ includeArchived: e.target.checked })}
          />
          Show archived
        </label>
      </div>

      {customers.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : customers.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(customers.error)}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {page > 0 ? (
              <Button variant="outline" onClick={() => update({ page: 0 })}>
                Nothing on this page. Back to the first page
              </Button>
            ) : filtering ? (
              'No customers match.'
            ) : (
              <div className="grid justify-items-center gap-3">
                <span>No customers yet. Add the first one to start invoicing.</span>
                <Button variant="outline" onClick={() => setForm({ open: true })}>
                  <Plus /> Add customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tax ID</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className={c.archived ? 'text-muted-foreground' : undefined}>
                  <TableCell className="pl-4 font-medium">
                    {c.name}
                    {c.archived && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.taxId}</TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    {c.archived ? (
                      isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={restore.isPending}
                          onClick={() => onRestore(c)}
                        >
                          <ArchiveRestore /> Restore
                        </Button>
                      )
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${c.name}`}
                          onClick={() => setForm({ open: true, customer: c })}
                        >
                          <Pencil />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Archive ${c.name}`}
                            onClick={() => setArchiving(c)}
                          >
                            <Archive />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {customers.data && (
        <Pagination
          page={customers.data.page ?? page}
          size={customers.data.size ?? 20}
          totalElements={customers.data.totalElements ?? 0}
          totalPages={customers.data.totalPages ?? 0}
          onPageChange={(p) => update({ page: p })}
        />
      )}

      <CustomerFormDialog
        open={form.open}
        customer={form.open ? form.customer : undefined}
        onOpenChange={(open) => !open && setForm({ open: false })}
      />
      <ArchiveCustomerDialog
        customer={archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        onArchived={() => {
          // The row disappears; if it was the only one on this page, step back a page.
          if (!includeArchived && rows.length === 1 && page > 0) update({ page: page - 1 })
        }}
      />
    </div>
  )
}
