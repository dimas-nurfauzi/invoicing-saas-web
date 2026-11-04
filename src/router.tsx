import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

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
      {
        path: 'invoices',
        element: <PlaceholderPage title="Invoices" description="List, issue, pay and void." />,
      },
      {
        path: 'invoices/ai',
        element: (
          <PlaceholderPage title="AI draft" description="Paste a billing request, review, save." />
        ),
      },
      {
        path: 'customers',
        element: <PlaceholderPage title="Customers" description="List, search, add and edit." />,
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export const router = createBrowserRouter(routes)
