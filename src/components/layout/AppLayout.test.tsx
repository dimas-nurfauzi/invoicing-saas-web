import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/router'

describe('AppLayout', () => {
  it('renders the navigation and the active page', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/customers'] })
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('link', { name: 'Invoices' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('List, search, add and edit.')).toBeInTheDocument()
  })
})
