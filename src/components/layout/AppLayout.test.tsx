import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

describe('AppLayout', () => {
  it('renders the navigation and the active page', async () => {
    signedIn()
    mockApi({ 'GET /api/me': () => json({ role: 'ADMIN' }) })
    renderApp('/ai-draft')

    expect(await screen.findByText('Paste a billing request, review, save.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI draft' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Invoices' })).not.toHaveAttribute('aria-current')
  })
})
