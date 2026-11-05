import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

describe('AppLayout', () => {
  it('renders the navigation and the active page', async () => {
    signedIn()
    mockApi({ 'GET /api/me': () => json({ role: 'ADMIN' }) })
    renderApp('/invoices')

    expect(await screen.findByText('List, issue, pay and void.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invoices' })).toHaveAttribute('aria-current', 'page')
  })
})
