import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <PlaceholderPage title="Dashboard" description="Billing summary per currency." />,
      },
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
]

export const router = createBrowserRouter(routes)
