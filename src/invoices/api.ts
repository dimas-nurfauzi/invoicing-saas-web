import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '@/api/client'
import type { InvoiceFormOutput, PaymentFormOutput } from './schemas'
import type { InvoiceStatus } from './types'

export const PAGE_SIZE = 20

/** Form values → request body. Empty optional fields are left out; amounts stay strings. */
export function toInvoiceRequest(values: InvoiceFormOutput): Schemas['InvoiceRequest'] {
  return {
    customerId: values.customerId,
    currency: values.currency,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    notes: values.notes.trim() || undefined,
    lines: values.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent || undefined,
      taxRatePercent: line.taxRatePercent || undefined,
    })),
  }
}

export function useInvoices(params: { status?: InvoiceStatus; page: number }) {
  return useQuery({
    queryKey: ['invoices', 'list', params],
    queryFn: () =>
      unwrap(
        api.GET('/api/invoices', {
          params: { query: { status: params.status, page: params.page, size: PAGE_SIZE } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/invoices/{id}', { params: { path: { id } } })),
  })
}

export function usePayments(invoiceId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['invoices', 'detail', invoiceId, 'payments'],
    queryFn: () =>
      unwrap(api.GET('/api/invoices/{invoiceId}/payments', { params: { path: { invoiceId } } })),
    enabled,
  })
}

/** Active customers for the invoice form (the first 100, A–Z). */
export function useCustomerOptions() {
  return useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => unwrap(api.GET('/api/customers', { params: { query: { page: 0, size: 100 } } })),
    staleTime: 30_000,
  })
}

/** After any change: invoice lists, this invoice and the dashboard totals are stale. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
    ])
}

export function useSaveInvoice(id?: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: Schemas['InvoiceRequest']) =>
      id
        ? unwrap(api.PUT('/api/invoices/{id}', { params: { path: { id } }, body }))
        : unwrap(api.POST('/api/invoices', { body })),
    onSuccess: invalidate,
  })
}

export function useIssueInvoice(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/invoices/{id}/issue', { params: { path: { id } } })),
    onSuccess: invalidate,
  })
}

export function useDeleteDraft(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/invoices/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['invoices', 'detail', id] })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ])
    },
  })
}

export function useVoidInvoice(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (reason: string) =>
      unwrap(api.POST('/api/invoices/{id}/void', { params: { path: { id } }, body: { reason } })),
    onSuccess: invalidate,
  })
}

export function useRecordPayment(invoiceId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (values: PaymentFormOutput) =>
      unwrap(
        api.POST('/api/invoices/{invoiceId}/payments', {
          params: { path: { invoiceId } },
          body: {
            amount: values.amount.trim(),
            paidOn: values.paidOn,
            method: values.method,
            reference: values.reference.trim() || undefined,
            note: values.note.trim() || undefined,
          },
        }),
      ),
    onSuccess: invalidate,
  })
}
