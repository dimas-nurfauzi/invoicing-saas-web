import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'
import { useAuth } from './auth-context'

/** The signed-in user's id, tenant id and role (ADMIN / STAFF). */
export function useMe() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => unwrap(api.GET('/api/me')),
    enabled: session !== null,
    staleTime: Infinity,
  })
}
