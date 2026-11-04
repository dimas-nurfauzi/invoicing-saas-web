import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockApi, problem } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'
import { loadSession } from './session'

const me = { userId: 'u1', tenantId: 't1', role: 'STAFF' }

describe('auth', () => {
  it('restores the session after a reload and shows workspace and role', async () => {
    signedIn('acme')
    mockApi({
      'GET /api/me': () => json(me),
      'GET /api/summary': () => json({ currencies: [] }),
    })
    renderApp('/')
    expect(await screen.findByText('STAFF')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
  })

  it('signs out and returns to login with a notice when the backend rejects the token', async () => {
    signedIn('acme')
    mockApi({
      'GET /api/me': () => problem(401, 'Unauthorized'),
      'GET /api/summary': () => problem(401, 'Unauthorized'),
    })
    const { router } = renderApp('/')

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(loadSession()).toBeNull()
  })

  it('signs out from the header', async () => {
    signedIn('acme')
    mockApi({
      'GET /api/me': () => json(me),
      'GET /api/summary': () => json({ currencies: [] }),
    })
    const { router } = renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(loadSession()).toBeNull()
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument()
  })

  it('redirects a signed-in user away from the login page', async () => {
    signedIn('acme')
    mockApi({
      'GET /api/me': () => json(me),
      'GET /api/summary': () => json({ currencies: [] }),
    })
    const { router } = renderApp('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
