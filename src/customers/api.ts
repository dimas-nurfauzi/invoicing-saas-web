import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/api/client'
import type { CustomerForm } from './schemas'

export const PAGE_SIZE = 20

export interface CustomerListParams {
  q: string
  /** 0-based. */
  page: number
  includeArchived: boolean
}

export function useCustomers({ q, page, includeArchived }: CustomerListParams) {
  return useQuery({
    queryKey: ['customers', 'list', { q, page, includeArchived }],
    queryFn: () =>
      unwrap(
        api.GET('/api/customers', {
          params: {
            query: { q: q || undefined, page, size: PAGE_SIZE, includeArchived },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

/** Create (no id) or full update (PUT) of a customer. */
export function useSaveCustomer(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CustomerForm) =>
      id
        ? unwrap(api.PUT('/api/customers/{id}', { params: { path: { id } }, body }))
        : unwrap(api.POST('/api/customers', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}

/** Archive (DELETE, ADMIN only) or restore (ADMIN only). */
export function useSetArchived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived
        ? unwrap(api.DELETE('/api/customers/{id}', { params: { path: { id } } }))
        : unwrap(api.POST('/api/customers/{id}/restore', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
