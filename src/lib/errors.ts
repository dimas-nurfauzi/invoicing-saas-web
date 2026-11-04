import { ApiError } from '@/api/client'

/** A message for the user: the backend's problem detail, or a generic one. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.problem.errors
    if (fields && Object.keys(fields).length > 0) {
      return Object.entries(fields)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('; ')
    }
    return error.message
  }
  if (error instanceof TypeError) return "Can't reach the server. Is the backend running?"
  return 'Something went wrong. Please try again.'
}
