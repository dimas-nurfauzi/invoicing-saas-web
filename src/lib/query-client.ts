import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 4xx (401, 403, 404, validation) won't succeed on retry; retry network/5xx once.
        retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  })
}
