import { describe, expect, it } from 'vitest'
import { addDaysIso, formatDate, todayIso } from './dates'

describe('dates', () => {
  it('formats today in local time', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  it('adds days across months and leap years', () => {
    expect(addDaysIso('2026-11-20', 14)).toBe('2026-12-04')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('formats an ISO date without shifting it by the time zone', () => {
    expect(formatDate('2026-11-04')).toBe('4 Nov 2026')
    expect(formatDate(undefined)).toBe('—')
  })
})
