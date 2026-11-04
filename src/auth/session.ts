import type { Schemas } from '@/api/client'

/** What survives a page reload. The role comes from GET /api/me, not from here. */
export interface Session {
  accessToken: string
  /** Epoch milliseconds. */
  expiresAt: number
  tenantSlug: string
}

const KEY = 'invoicing.session'

/**
 * sessionStorage: scoped to the tab and gone when it closes. Like localStorage it is readable by
 * any script on the page, so an XSS bug would expose the token (see README, "Auth").
 */
function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function saveSession(
  login: Schemas['LoginResponse'],
  tenantSlug: string,
  now = Date.now(),
): Session {
  if (!login.accessToken || !login.expiresIn) throw new Error('Login response has no token')
  const session: Session = {
    accessToken: login.accessToken,
    expiresAt: now + login.expiresIn * 1000,
    tenantSlug,
  }
  storage()?.setItem(KEY, JSON.stringify(session))
  return session
}

/** The stored session, or null if there is none, it is malformed or it has expired. */
export function loadSession(now = Date.now()): Session | null {
  const raw = storage()?.getItem(KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as Partial<Session>
    if (
      typeof s.accessToken === 'string' &&
      typeof s.expiresAt === 'number' &&
      typeof s.tenantSlug === 'string' &&
      s.expiresAt > now
    ) {
      return { accessToken: s.accessToken, expiresAt: s.expiresAt, tenantSlug: s.tenantSlug }
    }
  } catch {
    // fall through: malformed
  }
  clearSession()
  return null
}

export function clearSession() {
  storage()?.removeItem(KEY)
}
