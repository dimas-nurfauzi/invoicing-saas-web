import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from './types'

const STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  VOID: 'bg-muted text-muted-foreground line-through',
}

export function StatusBadge({ status }: { status?: InvoiceStatus }) {
  if (!status) return null
  return (
    <Badge variant="outline" className={cn('border-transparent', STYLES[status])}>
      {status}
    </Badge>
  )
}
