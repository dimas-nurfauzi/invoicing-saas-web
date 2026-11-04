/**
 * Money arrives from the API as decimal strings ("1500000.00"). It is formatted straight from the
 * string (Intl accepts decimal strings exactly), never parsed into a float. Always two fraction
 * digits, like the backend (scale 2): Intl's default for IDR is 0 digits, which would silently
 * round "1500000.50".
 */
export function formatMoney(amount: string | null | undefined, currency: string, locale = 'id-ID') {
  if (amount == null || amount.trim() === '') return '—'
  const value = amount.trim() as Intl.StringNumericLiteral
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    // Unknown currency code: still show the exact amount.
    return `${currency} ${amount}`
  }
}

const DECIMAL = /^\d+(\.\d+)?$/

/** True for a non-negative decimal string such as "12", "12.5" or "0.75" (what the API accepts). */
export function isDecimalString(value: string) {
  return DECIMAL.test(value.trim())
}
