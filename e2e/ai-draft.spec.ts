import { expect, test } from '@playwright/test'

// The one end-to-end flow the app is about: sign up → add a customer → paste a billing
// request → review the AI draft → save → issue. Everything runs against the real backend
// except POST /api/invoices/ai-draft, which is answered here (no API key in CI).

test('sign up, draft an invoice with AI, save and issue it', async ({ page }) => {
  const run = Date.now().toString(36)
  const workspace = `e2e-${run}`
  // A throwaway test password for a workspace this test creates in a disposable database.
  const password = `e2e-pass-${run}`

  // 1. Create a workspace (and get signed in).
  await page.goto('/login')
  await page.getByRole('tab', { name: 'Create workspace' }).click()
  await page.getByLabel('Business name').fill(`E2E ${run}`)
  await page.getByLabel('Workspace').fill(workspace)
  await page.getByLabel('Admin email').fill(`owner@${workspace}.test`)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('No invoices yet')).toBeVisible()

  // 2. Add the customer the request will mention.
  await page.getByRole('link', { name: 'Customers' }).click()
  await page.getByRole('button', { name: 'Add customer' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill('PT Maju Jaya')
  await dialog.getByLabel('Email').fill('finance@majujaya.test')
  await dialog.getByRole('button', { name: 'Add customer' }).click()
  await expect(page.getByRole('cell', { name: 'PT Maju Jaya', exact: true })).toBeVisible()

  // 3. Paste a request; the AI answer is mocked (customer not matched → the user picks it).
  let aiRequestBody: unknown
  await page.route('**/api/invoices/ai-draft', async (route) => {
    aiRequestBody = route.request().postDataJSON()
    await route.fulfill({
      json: {
        customerId: null,
        customerName: 'Maju Jaya',
        currency: 'IDR',
        issueDate: null,
        dueDate: null,
        notes: 'Transfer ke BCA 1234567890',
        lines: [
          {
            description: 'Desain ulang website',
            quantity: '1',
            unitPrice: '7500000.00',
            discountPercent: null,
            taxRatePercent: '11.00',
          },
          {
            description: 'Maintenance bulanan',
            quantity: '3',
            unitPrice: '1250000.00',
            discountPercent: '10.00',
            taxRatePercent: '11.00',
          },
        ],
        previewTotal: '12071250.00',
        warnings: ['No customer named "Maju Jaya"; pick one before saving'],
        attempts: 1,
      },
    })
  })
  const request =
    'Tagih Maju Jaya: desain ulang website 7,5 jt, maintenance 3 bulan @ 1,25 jt diskon 10%, PPN 11%'
  await page.getByRole('link', { name: 'AI draft' }).click()
  await page.getByLabel('Billing request').fill(request)
  await page.getByRole('button', { name: 'Draft invoice' }).click()
  expect(aiRequestBody).toEqual({ text: request })

  // 4. Review: warnings and preview shown; nothing saved until the user acts.
  await expect(page.getByText('pick one before saving')).toBeVisible()
  await expect(page.getByText('Rp 12.071.250,00')).toBeVisible()
  await expect(page.getByLabel('Line 2 discount %')).toHaveValue('10.00')
  await page.getByLabel('Customer').selectOption({ label: 'PT Maju Jaya · finance@majujaya.test' })
  await page.getByRole('button', { name: 'Save draft' }).click()

  // 5. Saved by the real backend, which computed the same total as the preview.
  await expect(page.getByRole('heading', { name: 'Draft invoice' })).toBeVisible()
  const totals = page.locator('tfoot')
  await expect(totals.getByRole('row', { name: /^Total/ })).toContainText('Rp 12.071.250,00')
  await expect(totals.getByRole('row', { name: /^Tax/ })).toContainText('Rp 1.196.250,00')

  // 6. Issue it: first number of the year for this workspace.
  await page.getByRole('button', { name: 'Issue' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Issue' }).click()
  await expect(page.getByRole('heading', { name: /^INV-\d{4}-0001$/ })).toBeVisible()
  await expect(page.getByText('SENT', { exact: true })).toBeVisible()

  // 7. The dashboard counts it.
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText('SENT 1')).toBeVisible()
  await expect(page.getByRole('region', { name: 'IDR summary' })).toContainText('Rp 12.071.250,00')
})
