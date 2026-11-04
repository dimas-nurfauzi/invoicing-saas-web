import type { Schemas } from '@/api/client'
import type { InvoiceLineView } from '@/invoices/types'
import { json } from './api-mock'

export const me =
  (role: 'ADMIN' | 'STAFF' = 'ADMIN') =>
  () =>
    json({ userId: 'u1', tenantId: 't1', role })

export function pageOf<T>(content: T[], extra: Record<string, number> = {}) {
  return json({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...extra,
  })
}

export const customerAcme: Schemas['CustomerResponse'] = {
  id: 'c1',
  name: 'Acme Corp',
  email: 'billing@acme.test',
  archived: false,
}

const line: InvoiceLineView = {
  lineNo: 1,
  description: 'Website redesign',
  quantity: '3.000',
  unitPrice: '500000.17',
  discountPercent: '0.00',
  taxRatePercent: '11.00',
  subtotal: '1500000.51',
  discount: '0.00',
  tax: '165000.06',
  total: '1665000.57',
}

export const draftInvoice: Schemas['InvoiceResponse'] = {
  id: 'i1',
  status: 'DRAFT',
  customer: { id: 'c1', name: 'Acme Corp' },
  currency: 'IDR',
  issueDate: '2026-11-04',
  dueDate: '2026-11-18',
  notes: 'Bank BCA 123',
  subtotal: '1500000.51',
  discountTotal: '0.00',
  taxTotal: '165000.06',
  total: '1665000.57',
  amountPaid: '0.00',
  balanceDue: '1665000.57',
  lines: [line],
}

export const sentInvoice: Schemas['InvoiceResponse'] = {
  ...draftInvoice,
  status: 'SENT',
  invoiceNumber: 'INV-2026-0001',
  issuedAt: '2026-11-04T03:00:00Z',
  billTo: { name: 'Acme Corp', email: 'billing@acme.test', address: 'Jl. Sudirman 1' },
}
