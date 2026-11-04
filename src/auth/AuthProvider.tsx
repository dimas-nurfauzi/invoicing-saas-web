import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAccessToken, setUnauthorizedHandler } from '@/api/client'
import { AuthContext, type AuthContextValue, type AuthNotice } from './auth-context'
import { clearSession, loadSession, saveSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // The token is handed to the API client synchronously (not in an effect): child components
  // start their queries before this component's effects run.
  const [session, setSession] = useState(() => {
    const restored = loadSession()
    setAccessToken(restored?.accessToken ?? null)
    return restored
  })
  const [notice, setNotice] = useState<AuthNotice | null>(null)

  const signOut = useCallback(
    (reason: AuthNotice = 'signed-out') => {
      clearSession()
      setAccessToken(null)
      queryClient.removeQueries()
      setNotice(reason)
      setSession(null)
    },
    [queryClient],
  )

  const signIn = useCallback<AuthContextValue['signIn']>(
    (login, tenantSlug) => {
      const next = saveSession(login, tenantSlug)
      setAccessToken(next.accessToken)
      queryClient.removeQueries()
      setNotice(null)
      setSession(next)
    },
    [queryClient],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => signOut('expired'))
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // No refresh token yet: sign out when the access token expires instead of waiting for a 401.
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(
      () => signOut('expired'),
      Math.max(0, session.expiresAt - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [session, signOut])

  const value = useMemo(
    () => ({ session, notice, signIn, signOut }),
    [session, notice, signIn, signOut],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
