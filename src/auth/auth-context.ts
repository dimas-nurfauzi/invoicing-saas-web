import { createContext, useContext } from 'react'
import type { Schemas } from '@/api/client'
import type { Session } from './session'

/** Why the user landed on the login page, shown there once. */
export type AuthNotice = 'expired' | 'signed-out'

export interface AuthContextValue {
  session: Session | null
  notice: AuthNotice | null
  signIn: (login: Schemas['LoginResponse'], tenantSlug: string) => void
  signOut: (notice?: AuthNotice) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
