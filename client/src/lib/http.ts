// Shared HTTP client. Every feature's api.ts calls the server through request().
// Error format: specs/data-model-and-api-contract.md → "Errors" (RFC 9457 + `code`).

/** The fields of a ProblemDetail the client relies on. */
export type ProblemDetail = {
  title: string
  status: number
  detail: string
  code: string
}

/** Shown for any error that is not a business error. Never expose internal details. */
export const SYSTEM_ERROR_MESSAGE = 'Something went wrong. Please try again in a few minutes.'

type ApiErrorKind = 'business' | 'system'

type ApiErrorOptions = {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string
  cause?: unknown
}

/**
 * Every failed call ends up as an ApiError.
 * `message` is always safe to show: the server's `detail` for a business error,
 * a generic text for a system error.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly code: string | undefined

  constructor({ kind, message, status, code, cause }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

// In development VITE_API_URL is empty, so calls stay relative and Vite proxies /api.
// In production it holds the server origin.
function readBaseUrl(): string {
  const value: unknown = import.meta.env.VITE_API_URL
  return typeof value === 'string' ? value.replace(/\/$/, '') : ''
}

const BASE_URL = readBaseUrl()

function isProblemDetail(value: unknown): value is ProblemDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string' &&
    'status' in value &&
    typeof value.status === 'number' &&
    'detail' in value &&
    typeof value.detail === 'string' &&
    'code' in value &&
    typeof value.code === 'string'
  )
}

// response.json() returns any: assign it to unknown, and treat an empty or broken body as null
async function readJson(response: Response): Promise<unknown> {
  try {
    const data: unknown = await response.json()
    return data
  } catch {
    return null
  }
}

function systemError(status?: number, cause?: unknown): ApiError {
  return new ApiError({ kind: 'system', message: SYSTEM_ERROR_MESSAGE, status, cause })
}

/**
 * Calls the server and returns the body checked by `parse`.
 * `parse` receives unknown data and must return a T or throw.
 */
export async function request<T>(
  path: string,
  parse: (data: unknown) => T,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch (cause) {
    // A canceled request is not an error to show: let the caller ignore it
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    // fetch only rejects when there is no response at all: network down, DNS, CORS
    throw systemError(undefined, cause)
  }

  const body = await readJson(response)

  if (response.ok) {
    try {
      return parse(body)
    } catch (cause) {
      // The server answered something that breaks the contract: the user cannot fix that
      throw systemError(response.status, cause)
    }
  }

  if (response.status < 500 && isProblemDetail(body)) {
    throw new ApiError({
      kind: 'business',
      message: body.detail,
      status: response.status,
      code: body.code,
    })
  }

  throw systemError(response.status)
}
