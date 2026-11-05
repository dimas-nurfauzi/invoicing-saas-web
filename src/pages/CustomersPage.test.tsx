import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Schemas } from '@/api/client'
import { json, mockApi, problem, requestsTo } from '@/test/api-mock'
import { renderApp, signedIn } from '@/test/render-app'

type Customer = Schemas['CustomerResponse']

const acme: Customer = {
  id: 'c1',
  name: 'Acme Corp',
  email: 'billing@acme.test',
  phone: '+62 21 555 0100',
  billingAddress: 'Jl. Sudirman 1, Jakarta',
  taxId: '01.234.567.8-901.000',
  archived: false,
}
const old: Customer = { id: 'c2', name: 'Old Shop', archived: true }

function page(content: Customer[], extra: Partial<Schemas['PageResponseCustomerResponse']> = {}) {
  return json({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...extra,
  })
}

const as = (role: 'ADMIN' | 'STAFF') => () => json({ userId: 'u1', tenantId: 't1', role })

function params(request: Request): Record<string, string> {
  const out: Record<string, string> = {}
  new URL(request.url).searchParams.forEach((value, key) => (out[key] = value))
  return out
}

describe('CustomersPage', () => {
  it('lists customers and pages through them, keeping the page in the URL', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': as('STAFF'),
      'GET /api/customers': (r) =>
        params(r).page === '1'
          ? page([{ id: 'c21', name: 'Zeta' }], { page: 1, totalElements: 21, totalPages: 2 })
          : page([acme], { totalElements: 21, totalPages: 2 }),
    })
    const { router } = renderApp('/customers')

    const row = (await screen.findByText('Acme Corp')).closest('tr')!
    expect(within(row).getByText('billing@acme.test')).toBeInTheDocument()
    expect(screen.getByText('1–20 of 21')).toBeInTheDocument()
    expect(params(requestsTo(fetchMock, 'GET /api/customers')[0])).toEqual({
      page: '0',
      size: '20',
      includeArchived: 'false',
    })

    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('Zeta')).toBeInTheDocument()
    expect(screen.getByText('21–21 of 21')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?page=2')
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('searches once the user stops typing', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': as('STAFF'),
      'GET /api/customers': (r) => (params(r).q === 'acme' ? page([acme]) : page([acme, old])),
    })
    const { router } = renderApp('/customers')
    await screen.findByText('Old Shop')

    await userEvent.type(screen.getByLabelText('Search customers'), 'acme')
    await waitFor(() => expect(screen.queryByText('Old Shop')).not.toBeInTheDocument())

    const queries = requestsTo(fetchMock, 'GET /api/customers').map((r) => params(r).q)
    expect(queries).toEqual([undefined, 'acme'])
    expect(router.state.location.search).toBe('?q=acme')
  })

  it('tells an empty workspace apart from a search without results', async () => {
    signedIn()
    mockApi({ 'GET /api/me': as('STAFF'), 'GET /api/customers': () => page([]) })
    renderApp('/customers')
    expect(await screen.findByText(/no customers yet/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search customers'), 'zzz')
    expect(await screen.findByText('No customers match.')).toBeInTheDocument()
  })

  it('validates, adds a customer and refreshes the list', async () => {
    signedIn()
    let created = false
    const fetchMock = mockApi({
      'GET /api/me': as('STAFF'),
      'GET /api/customers': () => page(created ? [acme] : []),
      'POST /api/customers': () => {
        created = true
        return json(acme, 201)
      },
    })
    renderApp('/customers')
    await screen.findByText(/no customers yet/i)
    await userEvent.click(screen.getAllByRole('button', { name: /add customer/i })[0])
    const dialog = await screen.findByRole('dialog')

    await userEvent.type(within(dialog).getByLabelText('Email'), 'not-an-email')
    await userEvent.type(within(dialog).getByLabelText('Phone'), 'call me')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add customer' }))
    expect(await within(dialog).findByText('Enter a name')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email')).toBeInTheDocument()
    expect(within(dialog).getByText(/3–30 digits/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/customers')).toHaveLength(0)

    await userEvent.type(within(dialog).getByLabelText('Name'), '  Acme Corp ')
    await userEvent.clear(within(dialog).getByLabelText('Email'))
    await userEvent.type(within(dialog).getByLabelText('Email'), 'billing@acme.test')
    await userEvent.clear(within(dialog).getByLabelText('Phone'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add customer' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument()
    const [post] = requestsTo(fetchMock, 'POST /api/customers')
    expect(await post.json()).toEqual({
      name: 'Acme Corp',
      email: 'billing@acme.test',
      phone: '',
      billingAddress: '',
      taxId: '',
    })
  })

  it('edits a customer: the form starts filled and a cleared field is sent empty', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': as('STAFF'),
      'GET /api/customers': () => page([acme]),
      'PUT /api/customers/c1': async (r) => json({ ...acme, ...(await r.clone().json()) }),
    })
    renderApp('/customers')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Acme Corp' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Billing address')).toHaveValue('Jl. Sudirman 1, Jakarta')

    await userEvent.clear(within(dialog).getByLabelText('Phone'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [put] = requestsTo(fetchMock, 'PUT /api/customers/c1')
    expect(await put.json()).toEqual({
      name: 'Acme Corp',
      email: 'billing@acme.test',
      phone: '',
      billingAddress: 'Jl. Sudirman 1, Jakarta',
      taxId: '01.234.567.8-901.000',
    })
  })

  it("shows the backend's error inside the dialog", async () => {
    signedIn()
    mockApi({
      'GET /api/me': as('STAFF'),
      'GET /api/customers': () => page([acme]),
      'PUT /api/customers/c1': () => problem(404, 'Customer not found'),
    })
    renderApp('/customers')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Acme Corp' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Customer not found')).toBeInTheDocument()
  })

  it('hides archive and restore from STAFF', async () => {
    signedIn()
    mockApi({ 'GET /api/me': as('STAFF'), 'GET /api/customers': () => page([acme, old]) })
    renderApp('/customers?archived=1')
    await screen.findByText('Old Shop')
    expect(screen.getByRole('button', { name: 'Edit Acme Corp' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /archive acme corp/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument()
    // Archived customers can't be edited (the backend answers 409).
    expect(screen.queryByRole('button', { name: 'Edit Old Shop' })).not.toBeInTheDocument()
  })

  it('lets ADMIN archive after confirming, and restore', async () => {
    signedIn()
    const fetchMock = mockApi({
      'GET /api/me': as('ADMIN'),
      'GET /api/customers': (r) =>
        page(params(r).includeArchived === 'true' ? [acme, old] : [acme]),
      'DELETE /api/customers/c1': () => new Response(null, { status: 204 }),
      'POST /api/customers/c2/restore': () => json({ ...old, archived: false }),
    })
    const { router } = renderApp('/customers')

    await userEvent.click(await screen.findByRole('button', { name: 'Archive Acme Corp' }))
    const dialog = await screen.findByRole('dialog')
    expect(requestsTo(fetchMock, 'DELETE /api/customers/c1')).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(requestsTo(fetchMock, 'DELETE /api/customers/c1')).toHaveLength(1))

    await userEvent.click(screen.getByLabelText('Show archived'))
    expect(router.state.location.search).toBe('?archived=1')
    await userEvent.click(await screen.findByRole('button', { name: /restore/i }))
    await waitFor(() =>
      expect(requestsTo(fetchMock, 'POST /api/customers/c2/restore')).toHaveLength(1),
    )
  })
})
