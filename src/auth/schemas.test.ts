import { describe, expect, it } from 'vitest'
import { registerSchema, slugify } from './schemas'

const valid = {
  tenantName: 'Toko Maju',
  tenantSlug: 'toko-maju',
  adminEmail: 'owner@tokomaju.test',
  adminPassword: 'password123',
}

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['ab', 'Toko', 'toko--maju', '-toko', 'toko-', 'toko maju'])(
    'rejects the slug %j like the backend does',
    (tenantSlug) => {
      expect(registerSchema.safeParse({ ...valid, tenantSlug }).success).toBe(false)
    },
  )

  it('enforces the password length the backend allows (8-72)', () => {
    expect(registerSchema.safeParse({ ...valid, adminPassword: 'short' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, adminPassword: 'x'.repeat(73) }).success).toBe(
      false,
    )
  })
})

describe('slugify', () => {
  it.each([
    ['Toko Maju Jaya', 'toko-maju-jaya'],
    ['  CV. Sinar  Abadi! ', 'cv-sinar-abadi'],
    ['Café Ñandú', 'cafe-nandu'],
    ['---', ''],
  ])('%j → %j', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })

  it('stays within 63 characters without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(62)} b`)
    expect(slug).toBe('a'.repeat(62))
  })
})
