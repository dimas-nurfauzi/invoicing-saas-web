import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, requestsTo } from '@/test/api-mock'
import { me, pageOf, sentInvoice } from '@/test/fixtures'
import { renderApp, signedIn } from '@/test/render-app'

const summary = {
  id: 'i1',
  invoiceNumber: 'INV-2026-0001',
  status: 'SENT',
  customer: { id: 'c1', name: 'Acme Corp' },
  currency: 'IDR',
  issueDate: '2026-11-04',
  dueDate: '2026-11-18',
  total: '1665000.57',
  amountPaid: '500000.00',
  balanceDue: '1165000.57',
}

describe('InvoicesPage', () => {
  it('lists invoices with formatted dates and amounts', async () => {
    signedIn()
    mockApi({ 'GET /api/me': me(), 'GET /api/invoices': () => pageOf([summary]) })
    renderApp('/invoices')

    const row = (await screen.findByRole('link', { name: 'INV-2026-0001' })).closest('tr')!
    expect(within(row).getByText('Acme Corp')).toBeInTheDocument()
    expect(within(row).getByText('SENT')).toBeInTheDocument()
    expect(within(row).getByText('4 Nov 2026')).toBeInTheDocument()
    expect(within(row).getByText(/1\.665\.000,57/)).toBeInTheDocument()
    expect(within(row).getByText(/1\.165\.000,57/)).toBeInTheDocument()
  })

  it('filters by status through the URL and the API', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': me(),
      'GET /api/invoices': (r) =>
        new URL(r.url).searchParams.get('status') === 'OVERDUE' ? pageOf([]) : pageOf([summary]),
    })
    const { router } = renderApp('/invoices')
    await screen.findByText('INV-2026-0001')

    await userEvent.click(screen.getByRole('button', { name: 'Overdue' }))
    expect(await screen.findByText('No overdue invoices.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?status=OVERDUE')
    const last = requestsTo(fetchMock, 'GET /api/invoices').at(-1)!
    expect(new URL(last.url).searchParams.get('status')).toBe('OVERDUE')
    expect(screen.getByRole('button', { name: 'Overdue' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens an invoice from the list', async () => {
    signedIn()
    mockApi({
      'GET /api/me': me(),
      'GET /api/invoices': () => pageOf([summary]),
      'GET /api/invoices/i1': () => new Response(JSON.stringify(sentInvoice), { status: 200 }),
      'GET /api/invoices/i1/payments': () => new Response('[]', { status: 200 }),
    })
    const { router } = renderApp('/invoices')
    await userEvent.click(await screen.findByText('Acme Corp'))
    expect(router.state.location.pathname).toBe('/invoices/i1')
    expect(await screen.findByRole('heading', { name: 'INV-2026-0001' })).toBeInTheDocument()
  })

  it('points to the AI draft when there are no invoices', async () => {
    signedIn()
    mockApi({ 'GET /api/me': me(), 'GET /api/invoices': () => pageOf([]) })
    renderApp('/invoices')
    expect(await screen.findByRole('link', { name: /draft one with ai/i })).toHaveAttribute(
      'href',
      '/ai-draft',
    )
  })
})
