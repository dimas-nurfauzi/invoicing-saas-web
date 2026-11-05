import type { Schemas } from '@/api/client'

export type Invoice = Schemas['InvoiceResponse']
export type InvoiceSummary = Schemas['InvoiceSummaryResponse']
export type InvoiceStatus = NonNullable<Invoice['status']>
export type Payment = Schemas['PaymentResponse']
export type PaymentMethod = Schemas['PaymentRequest']['method']

/**
 * A line of an invoice *response*. springdoc names both `InvoiceRequest.Line` and
 * `InvoiceResponse.Line` "Line", so the generated spec only has the request shape; the backend
 * also sends the computed fields below (strings, like all money). Backend follow-up: give the
 * response line its own schema name, then use the generated type.
 */
export type InvoiceLineView = Schemas['Line'] & {
  lineNo?: number
  subtotal?: string
  discount?: string
  tax?: string
  total?: string
}

export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'OVERDUE', 'PAID', 'VOID']

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'EWALLET', label: 'E-wallet' },
  { value: 'OTHER', label: 'Other' },
]
