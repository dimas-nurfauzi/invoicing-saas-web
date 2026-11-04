import { describe, expect, it } from 'vitest'
import { toInvoiceRequest } from './api'
import { invoiceSchema, lineSchema, paymentSchema } from './schemas'

const line = {
  description: 'Design',
  quantity: '1',
  unitPrice: '1500000',
  discountPercent: '',
  taxRatePercent: '11',
}
const invoice = {
  customerId: 'c1',
  currency: 'idr',
  issueDate: '2026-11-04',
  dueDate: '2026-11-18',
  notes: '',
  lines: [line],
}

describe('invoice schemas', () => {
  it.each([
    ['quantity', '0', false],
    ['quantity', '0.000', false],
    ['quantity', '1.5', true],
    ['quantity', '1.2345', false],
    ['unitPrice', '1500000.50', true],
    ['unitPrice', '1.500.000', false],
    ['unitPrice', '1500000,50', false],
    ['unitPrice', '-1', false],
    ['unitPrice', '0', true],
    ['taxRatePercent', '100', true],
    ['taxRatePercent', '100.01', false],
    ['taxRatePercent', '11.5', true],
    ['discountPercent', '', true],
  ])('%s %j valid: %s', (field, value, valid) => {
    expect(lineSchema.safeParse({ ...line, [field]: value }).success).toBe(valid)
  })

  it('upper-cases the currency and keeps amounts as strings', () => {
    const parsed = invoiceSchema.parse(invoice)
    expect(parsed.currency).toBe('IDR')
    expect(toInvoiceRequest(parsed)).toEqual({
      customerId: 'c1',
      currency: 'IDR',
      issueDate: '2026-11-04',
      dueDate: '2026-11-18',
      notes: undefined,
      lines: [
        {
          description: 'Design',
          quantity: '1',
          unitPrice: '1500000',
          discountPercent: undefined,
          taxRatePercent: '11',
        },
      ],
    })
  })

  it('rejects a due date before the issue date', () => {
    const result = invoiceSchema.safeParse({ ...invoice, dueDate: '2026-11-03' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(['dueDate'])
  })

  it('rejects a payment dated in the future or of zero', () => {
    const base = { amount: '10', paidOn: '2026-01-01', method: 'CASH', reference: '', note: '' }
    expect(paymentSchema.safeParse(base).success).toBe(true)
    expect(paymentSchema.safeParse({ ...base, amount: '0.00' }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...base, paidOn: '2999-01-01' }).success).toBe(false)
  })
})
