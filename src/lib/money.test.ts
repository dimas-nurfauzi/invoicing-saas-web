import { describe, expect, it } from 'vitest'
import { formatMoney, isDecimalString } from './money'

describe('formatMoney', () => {
  it('formats IDR decimal strings', () => {
    expect(formatMoney('1500000.00', 'IDR')).toMatch(/^Rp\s?1\.500\.000,00$/)
  })

  it('never rounds away cents, even for IDR', () => {
    expect(formatMoney('1500000.50', 'IDR')).toMatch(/^Rp\s?1\.500\.000,50$/)
  })

  it('keeps precision beyond what a double holds', () => {
    // 2^53 + 1 is not representable as a JS number.
    expect(formatMoney('9007199254740993.00', 'USD', 'en-US')).toBe('$9,007,199,254,740,993.00')
  })

  it('shows a dash for missing amounts', () => {
    expect(formatMoney(undefined, 'IDR')).toBe('—')
    expect(formatMoney('', 'IDR')).toBe('—')
  })

  it('falls back to the raw amount for an invalid currency code', () => {
    expect(formatMoney('10.00', 'XX')).toBe('XX 10.00')
  })
})

describe('isDecimalString', () => {
  it.each(['0', '12', '12.5', '0.75', ' 3 '])('accepts %j', (v) => {
    expect(isDecimalString(v)).toBe(true)
  })

  it.each(['', '-1', '1,5', '1e3', 'abc', '.5'])('rejects %j', (v) => {
    expect(isDecimalString(v)).toBe(false)
  })
})
