import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockApi, problem, requestsTo } from '@/test/api-mock'
import { customerAcme, draftInvoice, me, pageOf } from '@/test/fixtures'
import { renderApp, signedIn } from '@/test/render-app'

const draft = {
  customerId: null,
  customerName: 'Acme',
  currency: 'IDR',
  issueDate: '2026-11-04',
  dueDate: '2026-11-18',
  notes: 'Transfer ke BCA',
  lines: [
    {
      description: 'Website redesign',
      quantity: '1',
      unitPrice: '7500000.00',
      discountPercent: null,
      taxRatePercent: '11',
    },
  ],
  previewTotal: '8325000.00',
  warnings: ['No customer named "Acme"; pick one before saving'],
  attempts: 1,
}

const base = {
  'GET /api/me': me('STAFF'),
  'GET /api/customers': () => pageOf([customerAcme]),
}

describe('AiDraftPage', () => {
  it('turns pasted text into a draft, lets the user fix it, and saves through the normal endpoint', async () => {
    signedIn()
    const fetchMock = mockApi({
      ...base,
      'POST /api/invoices/ai-draft': () => json(draft),
      'POST /api/invoices': () => json(draftInvoice, 201),
      'GET /api/invoices/i1': () => json(draftInvoice),
    })
    const { router } = renderApp('/ai-draft')

    const draftButton = await screen.findByRole('button', { name: /draft invoice/i })
    expect(draftButton).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Billing request'), 'Bill Acme 7.5jt for the site')
    await userEvent.click(draftButton)

    // Review: warnings, preview total from the backend, form filled from the draft.
    expect(await screen.findByText(/pick one before saving/)).toBeInTheDocument()
    expect(screen.getByText(/8\.325\.000,00/)).toBeInTheDocument()
    expect(screen.getByLabelText('Line 1 description')).toHaveValue('Website redesign')
    expect(screen.getByLabelText('Line 1 unit price')).toHaveValue('7.500.000')
    expect(screen.getByLabelText('Line 1 discount %')).toHaveValue('')
    expect(requestsTo(fetchMock, 'POST /api/invoices')).toHaveLength(0)

    // No customer matched: saving is blocked until the user picks one.
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Choose a customer')).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/invoices')).toHaveLength(0)

    await userEvent.selectOptions(screen.getByLabelText('Customer'), 'c1')
    await userEvent.clear(screen.getByLabelText('Line 1 unit price'))
    await userEvent.type(screen.getByLabelText('Line 1 unit price'), '7000000')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/invoices/i1'))
    const [aiRequest] = requestsTo(fetchMock, 'POST /api/invoices/ai-draft')
    expect(await aiRequest.json()).toEqual({ text: 'Bill Acme 7.5jt for the site' })
    const [save] = requestsTo(fetchMock, 'POST /api/invoices')
    expect(await save.json()).toEqual({
      customerId: 'c1',
      currency: 'IDR',
      issueDate: '2026-11-04',
      dueDate: '2026-11-18',
      notes: 'Transfer ke BCA',
      lines: [
        {
          description: 'Website redesign',
          quantity: '1',
          unitPrice: '7000000',
          taxRatePercent: '11',
        },
      ],
    })
  })

  it('keeps a matched customer selected', async () => {
    signedIn()
    mockApi({
      ...base,
      'POST /api/invoices/ai-draft': () => json({ ...draft, customerId: 'c1', warnings: [] }),
    })
    renderApp('/ai-draft')
    await userEvent.type(await screen.findByLabelText('Billing request'), 'Bill Acme')
    await userEvent.click(screen.getByRole('button', { name: /draft invoice/i }))
    await waitFor(() => expect(screen.getByLabelText('Customer')).toHaveValue('c1'))
    expect(screen.queryByText('Check these')).not.toBeInTheDocument()
  })

  it('fills in the example with a real customer name', async () => {
    signedIn()
    mockApi(base)
    renderApp('/ai-draft')
    await waitFor(() =>
      expect(screen.getByLabelText('Billing request')).toHaveAttribute(
        'placeholder',
        expect.stringContaining('Acme Corp'),
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Use the example' }))
    expect((screen.getByLabelText('Billing request') as HTMLTextAreaElement).value).toContain(
      'invoice untuk Acme Corp',
    )
  })

  it('explains a missing API key and points to manual entry', async () => {
    signedIn()
    mockApi({
      ...base,
      'POST /api/invoices/ai-draft': () => problem(503, 'AI drafting is not configured'),
    })
    renderApp('/ai-draft')
    await userEvent.type(await screen.findByLabelText('Billing request'), 'Bill Acme')
    await userEvent.click(screen.getByRole('button', { name: /draft invoice/i }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('AI drafting is not configured')).toBeInTheDocument()
    expect(within(alert).getByText(/ANTHROPIC_API_KEY/)).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: 'New invoice' })).toHaveAttribute(
      'href',
      '/invoices/new',
    )
  })

  it('starts over from the review', async () => {
    signedIn()
    mockApi({ ...base, 'POST /api/invoices/ai-draft': () => json(draft) })
    renderApp('/ai-draft')
    await userEvent.type(await screen.findByLabelText('Billing request'), 'Bill Acme')
    await userEvent.click(screen.getByRole('button', { name: /draft invoice/i }))
    await userEvent.click(await screen.findByRole('button', { name: /start over/i }))
    expect(screen.getByLabelText('Billing request')).toHaveValue('Bill Acme')
  })
})
