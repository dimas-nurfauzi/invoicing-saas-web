import { useMutation } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '@/api/client'
import { newInvoiceDefaults } from '@/invoices/defaults'
import type { InvoiceForm } from '@/invoices/schemas'

export type AiDraft = Schemas['AiDraftResponse']

export const MAX_TEXT = 5000

/** Sends only the pasted text; the backend never saves anything here. */
export function useAiDraft() {
  return useMutation({
    mutationFn: (text: string) => unwrap(api.POST('/api/invoices/ai-draft', { body: { text } })),
  })
}

/** AI draft → invoice form values. Anything missing falls back to the manual-entry defaults. */
export function draftToForm(draft: AiDraft): InvoiceForm {
  const defaults = newInvoiceDefaults()
  const lines = (draft.lines ?? []).map((line) => ({
    description: line.description ?? '',
    quantity: line.quantity ?? '',
    unitPrice: line.unitPrice ?? '',
    discountPercent: line.discountPercent ?? '',
    taxRatePercent: line.taxRatePercent ?? '',
  }))
  return {
    customerId: draft.customerId ?? '',
    currency: draft.currency || defaults.currency,
    issueDate: draft.issueDate ?? defaults.issueDate,
    dueDate: draft.dueDate ?? defaults.dueDate,
    notes: draft.notes ?? '',
    lines: lines.length > 0 ? lines : defaults.lines,
  }
}
