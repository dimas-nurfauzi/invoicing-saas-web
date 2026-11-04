import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi, problem } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

const me = () => json({ userId: 'u1', tenantId: 't1', role: 'ADMIN' })

describe('DashboardPage', () => {
  it('shows one card per currency with formatted amounts and counts', async () => {
    signedIn()
    mockApi({
      'GET /api/me': me,
      'GET /api/summary': () =>
        json({
          from: null,
          to: null,
          currencies: [
            {
              currency: 'IDR',
              totalBilled: '1500000.50',
              totalPaid: '500000.00',
              totalOutstanding: '1000000.50',
              totalOverdue: '0.00',
              invoiceCounts: { DRAFT: 1, SENT: 2, PAID: 1, OVERDUE: 0, VOID: 0 },
            },
            {
              currency: 'USD',
              totalBilled: '200.00',
              totalPaid: '0.00',
              totalOutstanding: '200.00',
              totalOverdue: '200.00',
              invoiceCounts: { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 1, VOID: 0 },
            },
          ],
        }),
    })
    renderApp('/')

    const idr = await screen.findByRole('region', { name: 'IDR summary' })
    expect(within(idr).getByText(/1\.500\.000,50/)).toBeInTheDocument()
    expect(within(idr).getByText(/1\.000\.000,50/)).toBeInTheDocument()
    expect(within(idr).getByText('SENT 2')).toBeInTheDocument()

    const usd = screen.getByRole('region', { name: 'USD summary' })
    expect(within(usd).getByText('OVERDUE 1')).toBeInTheDocument()
  })

  it('points to the AI draft when there are no invoices yet', async () => {
    signedIn()
    mockApi({ 'GET /api/me': me, 'GET /api/summary': () => json({ currencies: [] }) })
    renderApp('/')

    expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /draft an invoice with ai/i })).toHaveAttribute(
      'href',
      '/invoices/ai',
    )
  })

  it('shows the backend error', async () => {
    signedIn()
    mockApi({ 'GET /api/me': me, 'GET /api/summary': () => problem(500, 'Boom') })
    renderApp('/')
    expect(await screen.findByText('Boom')).toBeInTheDocument()
  })
})
