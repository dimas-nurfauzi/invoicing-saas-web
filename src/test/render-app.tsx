import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { saveSession } from '@/auth/session'
import { routes } from '@/router'

/** Stores a valid session, as if the user had signed in before the page loaded. */
export function signedIn(tenantSlug = 'acme', accessToken = 'test-token') {
  saveSession({ accessToken, tokenType: 'Bearer', expiresIn: 3600 }, tenantSlug)
}

/** Renders the whole app (real routes, auth and query client) at the given path. */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}
