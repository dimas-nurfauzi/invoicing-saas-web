/** ISO dates (yyyy-mm-dd) as the API sends them. Compared as strings, which sorts correctly. */

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Today in the browser's time zone, as yyyy-mm-dd. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map((part) => Number.parseInt(part, 10))
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-11-04" → "4 Nov 2026"; '—' when missing. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso
    .slice(0, 10)
    .split('-')
    .map((part) => Number.parseInt(part, 10))
  if (!y || !m || !d) return iso
  return dateFormat.format(new Date(Date.UTC(y, m - 1, d)))
}

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** An API timestamp in the browser's time zone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date)
}
