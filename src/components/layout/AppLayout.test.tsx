import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { json, mockApi } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

describe('AppLayout', () => {
  it('renders the navigation and the active page', async () => {
    signedIn()
    mockApi({
      'GET /api/me': () => json({ role: 'ADMIN' }),
      'GET /api/customers': () => json({ content: [] }),
    })
    renderApp('/ai-draft')

    expect(await screen.findByRole('heading', { name: 'AI draft' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI draft' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Invoices' })).not.toHaveAttribute('aria-current')
  })
})
