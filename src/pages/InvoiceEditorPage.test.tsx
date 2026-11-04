import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { json, mockApi, problem, requestsTo } from '@/test/api-mock'
import { customerAcme, draftInvoice, me, pageOf } from '@/test/fixtures'
import { renderApp, signedIn } from '@/test/render-app'

const base = {
  'GET /api/me': me(),
  'GET /api/customers': () => pageOf([customerAcme, { id: 'c2', name: 'Beta Ltd' }]),
}

describe('new invoice', () => {
  it('validates, then saves a draft with amounts as strings and opens it', async () => {
    signedIn()
    const fetchMock = mockApi({
      ...base,
      'POST /api/invoices': () => json(draftInvoice, 201),
      'GET /api/invoices/i1': () => json(draftInvoice),
    })
    const { router } = renderApp('/invoices/new')
    await screen.findByRole('option', { name: /Acme Corp/ })

    await userEvent.type(screen.getByLabelText('Line 1 unit price'), '1.500.000')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Choose a customer')).toBeInTheDocument()
    expect(screen.getByText('Describe the item')).toBeInTheDocument()
    expect(screen.getByText(/up to 2 decimals/)).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/invoices')).toHaveLength(0)

    await userEvent.selectOptions(screen.getByLabelText('Customer'), 'c1')
    await userEvent.type(screen.getByLabelText('Line 1 description'), 'Website redesign')
    await userEvent.clear(screen.getByLabelText('Line 1 quantity'))
    await userEvent.type(screen.getByLabelText('Line 1 quantity'), '3')
    await userEvent.clear(screen.getByLabelText('Line 1 unit price'))
    await userEvent.type(screen.getByLabelText('Line 1 unit price'), '500000.17')
    await userEvent.type(screen.getByLabelText('Line 1 tax %'), '11')
    await userEvent.click(screen.getByRole('button', { name: /add line/i }))
    await userEvent.type(screen.getByLabelText('Line 2 description'), 'Hosting')
    await userEvent.type(screen.getByLabelText('Line 2 unit price'), '250000')
    await userEvent.type(screen.getByLabelText('Line 2 discount %'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/invoices/i1'))
    const [post] = requestsTo(fetchMock, 'POST /api/invoices')
    const body = await post.json()
    expect(body).toMatchObject({ customerId: 'c1', currency: 'IDR' })
    expect(body.notes).toBeUndefined()
    expect(body.dueDate >= body.issueDate).toBe(true)
    expect(body.lines).toEqual([
      {
        description: 'Website redesign',
        quantity: '3',
        unitPrice: '500000.17',
        taxRatePercent: '11',
      },
      { description: 'Hosting', quantity: '1', unitPrice: '250000', discountPercent: '10' },
    ])
  })

  it('removes a line but always keeps one', async () => {
    signedIn()
    mockApi(base)
    renderApp('/invoices/new')
    expect(await screen.findByRole('button', { name: 'Remove line 1' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /add line/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove line 1' }))
    expect(screen.queryByLabelText('Line 2 description')).not.toBeInTheDocument()
  })

  it("shows the backend's error", async () => {
    signedIn()
    mockApi({
      ...base,
      'POST /api/invoices': () => problem(409, 'Customer is archived; restore it before invoicing'),
    })
    renderApp('/invoices/new')
    await screen.findByRole('option', { name: /Acme Corp/ })
    await userEvent.selectOptions(screen.getByLabelText('Customer'), 'c1')
    await userEvent.type(screen.getByLabelText('Line 1 description'), 'X')
    await userEvent.type(screen.getByLabelText('Line 1 unit price'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText(/customer is archived/i)).toBeInTheDocument()
  })
})

describe('edit draft', () => {
  it('starts from the saved draft and replaces it with PUT', async () => {
    signedIn()
    const fetchMock = mockApi({
      ...base,
      'GET /api/invoices/i1': () => json(draftInvoice),
      'PUT /api/invoices/i1': () => json(draftInvoice),
    })
    const { router } = renderApp('/invoices/i1/edit')

    const description = await screen.findByLabelText('Line 1 description')
    expect(description).toHaveValue('Website redesign')
    await waitFor(() => expect(screen.getByLabelText('Customer')).toHaveValue('c1'))
    expect(screen.getByLabelText('Line 1 unit price')).toHaveValue('500000.17')
    expect(screen.getByLabelText('Notes')).toHaveValue('Bank BCA 123')

    await userEvent.clear(screen.getByLabelText('Notes'))
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/invoices/i1'))
    const [put] = requestsTo(fetchMock, 'PUT /api/invoices/i1')
    const body = await put.json()
    expect(body.notes).toBeUndefined()
    expect(body.lines[0]).toEqual({
      description: 'Website redesign',
      quantity: '3.000',
      unitPrice: '500000.17',
      discountPercent: '0.00',
      taxRatePercent: '11.00',
    })
  })

  it('refuses to edit an issued invoice', async () => {
    signedIn()
    mockApi({
      ...base,
      'GET /api/invoices/i1': () => json({ ...draftInvoice, status: 'SENT' }),
    })
    renderApp('/invoices/i1/edit')
    expect(await screen.findByText(/only drafts can be edited/i)).toBeInTheDocument()
    expect(within(document.body).queryByRole('button', { name: 'Save draft' })).toBeNull()
  })
})
