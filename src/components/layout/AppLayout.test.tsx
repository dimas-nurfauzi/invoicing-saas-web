import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

describe('AppLayout', () => {
  it('renders the navigation and the active page', async () => {
    signedIn()
    mockApi({ 'GET /api/me': () => json({ role: 'ADMIN' }) })
    renderApp('/customers')

    expect(await screen.findByText('List, search, add and edit.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invoices' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page')
  })
})
