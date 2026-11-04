import createClient, { type Middleware } from 'openapi-fetch'
import type { components, paths } from './schema'

export type Schemas = components['schemas']

/** RFC 9457 problem detail, as returned by the backend's GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errors?: Record<string, string>
  [key: string]: unknown
}

/** Error thrown by {@link unwrap} for any non-2xx response. */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

let accessToken: string | null = null
let onUnauthorized: (() => void) | null = null

/** Set by the auth module; attached as a bearer token to every request. */
export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Called when the backend rejects the current token (401), e.g. because it expired. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

const auth: Middleware = {
  onRequest({ request }) {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  },
  onResponse({ request, response }) {
    // Only when the rejected request carried the *current* token: a failed login (no token) or
    // a late response for a token that was already replaced must not sign the user out.
    const sent = request.headers.get('Authorization')
    if (response.status === 401 && accessToken && sent === `Bearer ${accessToken}`) {
      onUnauthorized?.()
    }
    return response
  },
}

/**
 * Typed API client generated from the backend's OpenAPI spec. Default base URL = same origin: in
 * development the Vite server proxies /api to Spring Boot. Set VITE_API_BASE_URL to call the
 * backend directly (then the backend needs this origin in CORS_ALLOWED_ORIGINS).
 */
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || window.location.origin,
  // Look up fetch per call (not once at import), so tests can stub it.
  fetch: (request) => globalThis.fetch(request),
})
api.use(auth)

/** Returns the data of a successful response, or throws {@link ApiError}. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call
  if (!response.ok) {
    const problem =
      error && typeof error === 'object' ? (error as ProblemDetail) : { status: response.status }
    throw new ApiError(response.status, problem)
  }
  return data as T
}
