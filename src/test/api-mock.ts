import { vi } from 'vitest'

type Handler = (request: Request) => Response | Promise<Response>

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  })
}

export function problem(status: number, detail: string): Response {
  return json({ type: 'about:blank', status, detail }, status)
}

/**
 * Stubs global fetch with handlers keyed by "METHOD /path". Unmatched requests fail the test
 * loudly (501) instead of hanging. Returns the mock to inspect calls.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const key = `${request.method} ${new URL(request.url).pathname}`
    const handler = handlers[key]
    return handler ? handler(request) : problem(501, `No mock for ${key}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The Request objects passed to the mock for a given "METHOD /path". */
export function requestsTo(fetchMock: ReturnType<typeof mockApi>, key: string): Request[] {
  return fetchMock.mock.calls
    .map(([input]) => input as Request)
    .filter((r) => `${r.method} ${new URL(r.url).pathname}` === key)
}
