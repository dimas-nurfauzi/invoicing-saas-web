import { z } from 'zod'
import { todayIso } from '@/lib/dates'
import { DECIMAL_FORMAT_HINT, parseDecimal } from '@/lib/number-utils'

// Mirrors InvoiceRequest / PaymentRequest / VoidRequest on the backend. Numbers are typed the
// Indonesian way ("1.500.000,50"); parsing turns them into the API's decimal strings
// ("1500000.50"), and the patterns below check those without converting to a JS number.

const ZERO = /^0+(\.0+)?$/

/** Up to 9 integer digits and 3 decimals, greater than 0 (`@Digits(9, 3)`, `> 0`). */
export const QUANTITY = /^\d{1,9}(\.\d{1,3})?$/
/** Up to 15 integer digits and 2 decimals (`@Digits(15, 2)`). */
export const UNIT_PRICE = /^\d{1,15}(\.\d{1,2})?$/
/** 0–100 with up to 2 decimals. */
export const PERCENT = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/
/** Payment amount: up to 17 integer digits and 2 decimals, greater than 0. */
export const AMOUNT = /^\d{1,17}(\.\d{1,2})?$/

/** Input text → API decimal string, or an issue with the format hint. */
const toApiDecimal = (value: string, ctx: z.RefinementCtx) => {
  const parsed = parseDecimal(value)
  if (parsed === null) {
    ctx.addIssue({ code: 'custom', message: DECIMAL_FORMAT_HINT })
    return z.NEVER
  }
  return parsed
}

const decimal = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .transform(toApiDecimal)
    .pipe(z.string().regex(pattern, message))

const optionalPercent = z
  .string()
  .trim()
  .transform((v, ctx) => (v === '' ? '' : toApiDecimal(v, ctx)))
  .pipe(z.string().refine((v) => v === '' || PERCENT.test(v), '0–100, up to 2 decimals'))

export const lineSchema = z.object({
  description: z.string().trim().min(1, 'Describe the item').max(500, 'At most 500 characters'),
  quantity: decimal(QUANTITY, 'Up to 9 digits and 3 decimals').refine(
    (v) => !ZERO.test(v),
    'Must be more than 0',
  ),
  unitPrice: decimal(UNIT_PRICE, 'Up to 15 digits and 2 decimals'),
  discountPercent: optionalPercent,
  taxRatePercent: optionalPercent,
})

export const invoiceSchema = z
  .object({
    customerId: z.string().min(1, 'Choose a customer'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, '3-letter code, e.g. IDR'),
    issueDate: z.iso.date('Pick a date'),
    dueDate: z.iso.date('Pick a date'),
    notes: z.string().max(2000, 'At most 2000 characters'),
    lines: z.array(lineSchema).min(1, 'Add at least one line').max(100, 'At most 100 lines'),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    path: ['dueDate'],
    message: 'Must be on or after the issue date',
  })

export type InvoiceForm = z.input<typeof invoiceSchema>
export type InvoiceFormOutput = z.output<typeof invoiceSchema>

export const EMPTY_LINE: InvoiceForm['lines'][number] = {
  description: '',
  quantity: '1',
  unitPrice: '',
  discountPercent: '',
  taxRatePercent: '',
}

export const paymentSchema = z.object({
  amount: decimal(AMOUNT, 'Up to 17 digits and 2 decimals').refine(
    (v) => !ZERO.test(v),
    'Must be more than 0',
  ),
  paidOn: z.iso.date('Pick a date').refine((v) => v <= todayIso(), "Can't be in the future"),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'EWALLET', 'OTHER']),
  reference: z.string().trim().max(100, 'At most 100 characters'),
  note: z.string().trim().max(500, 'At most 500 characters'),
})
export type PaymentForm = z.input<typeof paymentSchema>
export type PaymentFormOutput = z.output<typeof paymentSchema>

export const voidSchema = z.object({
  reason: z.string().trim().min(3, 'At least 3 characters').max(500, 'At most 500 characters'),
})
export type VoidForm = z.input<typeof voidSchema>
