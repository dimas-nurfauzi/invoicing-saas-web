import { describe, expect, it } from 'vitest'
import { clearSession, loadSession, saveSession } from './session'

const login = { accessToken: 'abc', tokenType: 'Bearer', expiresIn: 3600 }

describe('session', () => {
  it('saves and restores a session with its expiry', () => {
    const saved = saveSession(login, 'acme', 1_000)
    expect(saved).toEqual({ accessToken: 'abc', expiresAt: 3_601_000, tenantSlug: 'acme' })
    expect(loadSession(2_000)).toEqual(saved)
  })

  it('drops an expired session', () => {
    saveSession(login, 'acme', 1_000)
    expect(loadSession(3_601_000)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('drops a malformed session', () => {
    window.sessionStorage.setItem('invoicing.session', '{"accessToken": 1')
    expect(loadSession()).toBeNull()
    window.sessionStorage.setItem('invoicing.session', '{"accessToken": "x"}')
    expect(loadSession()).toBeNull()
  })

  it('clears the session', () => {
    saveSession(login, 'acme')
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('rejects a login response without a token', () => {
    expect(() => saveSession({ expiresIn: 3600 }, 'acme')).toThrow()
  })
})
