import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { AiDraftPage } from '@/pages/AiDraftPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage'
import { EditInvoicePage, NewInvoicePage } from '@/pages/InvoiceEditorPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { LoginPage } from '@/pages/LoginPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'invoices/new', element: <NewInvoicePage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'invoices/:id/edit', element: <EditInvoicePage /> },
      { path: 'ai-draft', element: <AiDraftPage /> },
      { path: 'customers', element: <CustomersPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
