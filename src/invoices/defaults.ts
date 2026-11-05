import { addDaysIso, todayIso } from '@/lib/dates'
import { EMPTY_LINE, type InvoiceForm } from './schemas'

/** A new invoice: IDR (the backend's default), issued today, due in 14 days, one empty line. */
export function newInvoiceDefaults(): InvoiceForm {
  const today = todayIso()
  return {
    customerId: '',
    currency: 'IDR',
    issueDate: today,
    dueDate: addDaysIso(today, 14),
    notes: '',
    lines: [{ ...EMPTY_LINE }],
  }
}
