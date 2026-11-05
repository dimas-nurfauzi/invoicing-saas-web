import { z } from 'zod'

// Same rules as the backend's CustomerRequest. Optional fields are sent as '' when empty: the
// backend stores blank as null, so clearing a field in the form clears it on the customer.

const emailFormat = z.email()

export const PHONE_PATTERN = /^$|^[0-9+()\-. ]{3,30}$/

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200, 'At most 200 characters'),
  email: z
    .string()
    .trim()
    .max(254, 'At most 254 characters')
    .refine((v) => v === '' || emailFormat.safeParse(v).success, 'Enter a valid email'),
  phone: z.string().trim().regex(PHONE_PATTERN, '3–30 digits, spaces or + ( ) - .'),
  billingAddress: z.string().trim().max(500, 'At most 500 characters'),
  taxId: z.string().trim().max(30, 'At most 30 characters'),
})
export type CustomerForm = z.infer<typeof customerSchema>

export const EMPTY_CUSTOMER: CustomerForm = {
  name: '',
  email: '',
  phone: '',
  billingAddress: '',
  taxId: '',
}
