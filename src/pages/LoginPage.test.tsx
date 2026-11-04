import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadSession } from '@/auth/session'
import { json, mockApi, problem, requestsTo } from '@/test/api-mock'
import { renderApp } from '@/test/render-app'

const token = { accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 3600 }
const emptySummary = { from: null, to: null, currencies: [] }

describe('LoginPage', () => {
  it('sends signed-out users to the login page', async () => {
    mockApi({})
    const { router } = renderApp('/customers')
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('validates before calling the backend', async () => {
    const fetchMock = mockApi({})
    renderApp('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your workspace')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows the backend's error when the login fails", async () => {
    mockApi({ 'POST /api/auth/login': () => problem(401, 'Invalid credentials') })
    renderApp('/login')
    await fillLogin()

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(loadSession()).toBeNull()
  })

  it('signs in, stores the session and returns to the page the user wanted', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/login': () => json(token),
      'GET /api/me': () => json({ userId: 'u1', tenantId: 't1', role: 'ADMIN' }),
      'GET /api/summary': () => json(emptySummary),
    })
    const { router } = renderApp('/customers')
    await fillLogin()

    await waitFor(() => expect(router.state.location.pathname).toBe('/customers'))
    expect(await screen.findByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(loadSession()?.accessToken).toBe('new-token')

    const [login] = requestsTo(fetchMock, 'POST /api/auth/login')
    expect(await login.json()).toEqual({
      tenantSlug: 'acme',
      email: 'owner@acme.test',
      password: 'secret-pass',
    })
    const [me] = requestsTo(fetchMock, 'GET /api/me')
    expect(me.headers.get('Authorization')).toBe('Bearer new-token')
  })

  it('creates a workspace, then signs in as its admin', async () => {
    const fetchMock = mockApi({
      'POST /api/tenants': () =>
        json({ tenantId: 't1', tenantSlug: 'toko-maju', userId: 'u1', role: 'ADMIN' }, 201),
      'POST /api/auth/login': () => json(token),
      'GET /api/me': () => json({ userId: 'u1', tenantId: 't1', role: 'ADMIN' }),
      'GET /api/summary': () => json(emptySummary),
    })
    renderApp('/login')
    await userEvent.click(await screen.findByRole('tab', { name: 'Create workspace' }))
    await userEvent.type(screen.getByLabelText('Business name'), 'Toko Maju')
    expect(screen.getByLabelText('Workspace')).toHaveValue('toko-maju')
    await userEvent.type(screen.getByLabelText('Admin email'), 'owner@tokomaju.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    const [registration] = requestsTo(fetchMock, 'POST /api/tenants')
    expect(await registration.json()).toEqual({
      tenantName: 'Toko Maju',
      tenantSlug: 'toko-maju',
      adminEmail: 'owner@tokomaju.test',
      adminPassword: 'password123',
    })
    const [login] = requestsTo(fetchMock, 'POST /api/auth/login')
    expect(await login.json()).toEqual({
      tenantSlug: 'toko-maju',
      email: 'owner@tokomaju.test',
      password: 'password123',
    })
  })

  it('shows a taken workspace slug', async () => {
    mockApi({ 'POST /api/tenants': () => problem(409, "Slug 'acme' is already taken") })
    renderApp('/login')
    await userEvent.click(await screen.findByRole('tab', { name: 'Create workspace' }))
    await userEvent.type(screen.getByLabelText('Business name'), 'Acme')
    await userEvent.type(screen.getByLabelText('Admin email'), 'owner@acme.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(await screen.findByText("Slug 'acme' is already taken")).toBeInTheDocument()
  })
})

async function fillLogin() {
  await userEvent.type(await screen.findByLabelText('Workspace'), 'acme')
  await userEvent.type(screen.getByLabelText('Email'), 'owner@acme.test')
  await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}
