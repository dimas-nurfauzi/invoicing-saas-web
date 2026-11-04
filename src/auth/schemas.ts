import { z } from 'zod'

// Same limits as the backend's LoginRequest / TenantRegistrationRequest.

export const SLUG_PATTERN = /^[a-z0-9](-?[a-z0-9])*$/

export const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1, 'Enter your workspace').max(63),
  email: z.email('Enter a valid email').max(254),
  password: z.string().min(1, 'Enter your password').max(72),
})
export type LoginForm = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  tenantName: z.string().trim().min(1, 'Enter your business name').max(200),
  tenantSlug: z
    .string()
    .min(3, 'At least 3 characters')
    .max(63, 'At most 63 characters')
    .regex(SLUG_PATTERN, 'Lowercase letters and digits, single hyphens in between'),
  adminEmail: z.email('Enter a valid email').max(254),
  adminPassword: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters'),
})
export type RegisterForm = z.infer<typeof registerSchema>

/** Suggests a workspace slug from the business name: "Toko Maju Jaya" → "toko-maju-jaya". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/, '')
}
