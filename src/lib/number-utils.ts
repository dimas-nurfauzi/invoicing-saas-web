/**
 * Numbers typed into forms, Indonesian style: "." groups thousands and "," marks decimals
 * ("1.500.000,50"). The API speaks plain decimal strings ("1500000.50"). Like xeloka's
 * `NumberUtils.parseBigDecimal`, text is converted string to string and never goes through a JS
 * number, so no digit can change.
 *
 * The format is strict on purpose: "1.500" is fifteen hundred (as anyone in Indonesia reads it),
 * and "1.5" is rejected instead of being guessed at.
 */

/** Either plain digits or correctly grouped thousands, then an optional ",decimals". */
const INPUT = /^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/
const API_DECIMAL = /^\d+(\.\d+)?$/

export const DECIMAL_FORMAT_HINT = 'Use , for decimals and . for thousands, e.g. 1.500.000,50'

/**
 * "1.500.000,50" → "1500000.50". Returns null when the text isn't a non-negative number in this
 * format. Leading zeros are dropped ("007" → "7"); decimals are kept exactly as typed.
 */
export function parseDecimal(text: string): string | null {
  const value = text.trim()
  if (!INPUT.test(value)) return null
  const [integer, fraction] = value.split(',')
  const digits = integer.replace(/\./g, '').replace(/^0+(?=\d)/, '')
  return fraction === undefined ? digits : `${digits}.${fraction}`
}

/**
 * API decimal → Indonesian text, for inputs and plain numbers on screen: "1500000.50" →
 * "1.500.000,50", "11.00" → "11". Decimals are dropped when they are all zeros; `trimZeros` also
 * drops trailing zeros ("1.500" → "1,5"), for quantities and percentages rather than money.
 * Anything that isn't a plain decimal string is returned unchanged.
 */
export function toInputDecimal(
  value: string | null | undefined,
  { trimZeros = false }: { trimZeros?: boolean } = {},
): string {
  if (value == null) return ''
  const trimmed = value.trim()
  if (!API_DECIMAL.test(trimmed)) return trimmed
  const [integer, rawFraction = ''] = trimmed.split('.')
  const fraction = trimZeros ? rawFraction.replace(/0+$/, '') : rawFraction
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return /^0*$/.test(fraction) ? grouped : `${grouped},${fraction}`
}
