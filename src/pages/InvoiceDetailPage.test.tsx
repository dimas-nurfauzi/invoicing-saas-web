import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockApi, problem, requestsTo } from '@/test/api-mock'
import { draftInvoice, me, sentInvoice } from '@/test/fixtures'
import { renderApp, signedIn } from '@/test/render-app'

describe('InvoiceDetailPage', () => {
  it('shows lines and totals as calculated by the backend', async () => {
    signedIn()
    const lines = [
      draftInvoice.lines![0],
      { ...draftInvoice.lines![0], lineNo: 2, description: 'Hosting', quantity: '1.500' },
    ]
    mockApi({
      'GET /api/me': me(),
      'GET /api/invoices/i1': () => json({ ...draftInvoice, lines }),
    })
    renderApp('/invoices/i1')

    const row = (await screen.findByText('Website redesign')).closest('tr')!
    expect(within(row).getByText('11%')).toBeInTheDocument()
    expect(within(row).getByText('3')).toBeInTheDocument()
    // "1.500" from the API is one and a half, shown the Indonesian way (not fifteen hundred).
    const hosting = screen.getByText('Hosting').closest('tr')!
    expect(within(hosting).getByText('1,5')).toBeInTheDocument()
    expect(within(row).getByText(/1\.665\.000,57/)).toBeInTheDocument()
    const footer = screen.getByText('Subtotal').closest('tfoot')!
    expect(within(footer).getByText(/1\.500\.000,51/)).toBeInTheDocument()
    expect(within(footer).getByText(/165\.000,06/)).toBeInTheDocument()
    expect(screen.getByText(/copied when issued/i)).toBeInTheDocument()
  })

  it('issues a draft after confirming', async () => {
    signedIn()
    let issued = false
    const fetchMock = mockApi({
      'GET /api/me': me('STAFF'),
      'GET /api/invoices/i1': () => json(issued ? sentInvoice : draftInvoice),
      'GET /api/invoices/i1/payments': () => json([]),
      'POST /api/invoices/i1/issue': () => {
        issued = true
        return json(sentInvoice)
      },
    })
    renderApp('/invoices/i1')
    await userEvent.click(await screen.findByRole('button', { name: /issue/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Issue' }))

    expect(await screen.findByRole('heading', { name: 'INV-2026-0001' })).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/invoices/i1/issue')).toHaveLength(1)
    expect(screen.getByText('Jl. Sudirman 1')).toBeInTheDocument()
    expect(screen.getByText('No payments yet.')).toBeInTheDocument()
  })

  it('deletes a draft and goes back to the list', async () => {
    signedIn()
    mockApi({
      'GET /api/me': me(),
      'GET /api/invoices/i1': () => json(draftInvoice),
      'DELETE /api/invoices/i1': () => new Response(null, { status: 204 }),
      'GET /api/invoices': () => json({ content: [], totalElements: 0, totalPages: 0 }),
    })
    const { router } = renderApp('/invoices/i1')
    await userEvent.click(await screen.findByRole('button', { name: /delete/i }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/invoices'))
  })

  it('records a payment, defaulting to the balance due', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': me('STAFF'),
      'GET /api/invoices/i1': () => json(sentInvoice),
      'GET /api/invoices/i1/payments': () => json([]),
      'POST /api/invoices/i1/payments': () =>
        json({ payment: { id: 'p1' }, invoice: { ...sentInvoice, status: 'PAID' } }, 201),
    })
    renderApp('/invoices/i1')
    await userEvent.click(await screen.findByRole('button', { name: /record payment/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Amount (IDR)')).toHaveValue('1.665.000,57')

    await userEvent.clear(within(dialog).getByLabelText('Amount (IDR)'))
    await userEvent.type(within(dialog).getByLabelText('Amount (IDR)'), '500.000,5')
    await userEvent.selectOptions(within(dialog).getByLabelText('Method'), 'CASH')
    await userEvent.type(within(dialog).getByLabelText('Reference'), 'RCPT-9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record payment' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [post] = requestsTo(fetchMock, 'POST /api/invoices/i1/payments')
    const body = await post.json()
    expect(body).toMatchObject({ amount: '500000.5', method: 'CASH', reference: 'RCPT-9' })
    expect(body.note).toBeUndefined()
  })

  it("shows the backend's payment error", async () => {
    signedIn()
    mockApi({
      'GET /api/me': me(),
      'GET /api/invoices/i1': () => json(sentInvoice),
      'GET /api/invoices/i1/payments': () => json([]),
      'POST /api/invoices/i1/payments': () =>
        problem(400, 'Payment exceeds the balance due of 1665000.57'),
    })
    renderApp('/invoices/i1')
    await userEvent.click(await screen.findByRole('button', { name: /record payment/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record payment' }))
    expect(await within(dialog).findByText(/exceeds the balance due/)).toBeInTheDocument()
  })

  it('offers void to ADMIN only, with a required reason', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': me('ADMIN'),
      'GET /api/invoices/i1': () => json(sentInvoice),
      'GET /api/invoices/i1/payments': () => json([]),
      'POST /api/invoices/i1/void': () => json({ ...sentInvoice, status: 'VOID' }),
    })
    renderApp('/invoices/i1')
    await userEvent.click(await screen.findByRole('button', { name: /void/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Void invoice' }))
    expect(await within(dialog).findByText('At least 3 characters')).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Wrong customer')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Void invoice' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'POST /api/invoices/i1/void')).toHaveLength(1))
    expect(await requestsTo(fetchMock, 'POST /api/invoices/i1/void')[0].json()).toEqual({
      reason: 'Wrong customer',
    })
  })

  it('hides void from STAFF', async () => {
    signedIn()
    mockApi({
      'GET /api/me': me('STAFF'),
      'GET /api/invoices/i1': () => json(sentInvoice),
      'GET /api/invoices/i1/payments': () => json([]),
    })
    renderApp('/invoices/i1')
    expect(await screen.findByRole('button', { name: /record payment/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /void/i })).not.toBeInTheDocument()
  })

  it("treats another tenant's invoice as not found", async () => {
    signedIn()
    mockApi({
      'GET /api/me': me(),
      'GET /api/invoices/i1': () => problem(404, 'Invoice not found'),
    })
    renderApp('/invoices/i1')
    expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
  })
})
