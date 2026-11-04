import { useQuery } from '@tanstack/react-query'
import { FileText, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router'
import { api, unwrap, type Schemas } from '@/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'

const STATUSES = ['DRAFT', 'SENT', 'OVERDUE', 'PAID', 'VOID'] as const

export function DashboardPage() {
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => unwrap(api.GET('/api/summary')),
  })

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          All-time totals per currency. Amounts are never converted between currencies.
        </p>
      </div>
      {summary.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : summary.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(summary.error)}</AlertDescription>
        </Alert>
      ) : summary.data.currencies?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {summary.data.currencies.map((c) => (
            <CurrencyCard key={c.currency} summary={c} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function CurrencyCard({ summary }: { summary: Schemas['CurrencySummary'] }) {
  const { currency = '' } = summary
  const stats = [
    { label: 'Billed', value: summary.totalBilled },
    { label: 'Paid', value: summary.totalPaid },
    { label: 'Outstanding', value: summary.totalOutstanding },
    { label: 'Overdue', value: summary.totalOverdue, alert: true },
  ]
  return (
    <Card role="region" aria-label={`${currency} summary`}>
      <CardHeader>
        <CardTitle>{currency}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd
                className={
                  s.alert && s.value && !/^0+(\.0+)?$/.test(s.value)
                    ? 'text-lg font-semibold text-destructive'
                    : 'text-lg font-semibold'
                }
              >
                {formatMoney(s.value, currency)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Badge key={status} variant="outline">
              {status} {summary.invoiceCounts?.[status] ?? 0}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" /> No invoices yet
        </CardTitle>
        <CardDescription>
          Totals show up here once you issue invoices. Fastest way in: paste a billing request and
          let the AI draft the invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/ai-draft">
            <Sparkles /> Draft an invoice with AI
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/customers">
            <Users /> Add a customer
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
