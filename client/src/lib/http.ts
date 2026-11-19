// Shared HTTP client. Every feature's api.ts calls the server through request().
// Error format: specs/data-model-and-api-contract.md → "Errors" (RFC 9457 + `code`).

/** The fields of a ProblemDetail the client relies on. */
export type ProblemDetail = {
  title: string
  status: number
  detail: string
  code: string
  errors?: Record<string, string>
}

/** Shown for any error that is not a business error. Never expose internal details. */
export const SYSTEM_ERROR_MESSAGE = 'Something went wrong. Please try again in a few minutes.'

type ApiErrorKind = 'business' | 'system'

type ApiErrorOptions = {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string
  fieldErrors?: Record<string, string>
  cause?: unknown
  problem?: unknown
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
  /** For VALIDATION_FAILED: the message of each invalid field, keyed by its name. */
  readonly fieldErrors: Record<string, string>
  /** The whole ProblemDetail, for the extra fields some errors carry, such as opensAt. Validate before use. */
  readonly problem: unknown

  constructor({ kind, message, status, code, fieldErrors, cause, problem }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors ?? {}
    this.problem = problem
  }
}

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

function readFieldErrors(value: ProblemDetail): Record<string, string> {
  const errors: unknown = value.errors
  if (typeof errors !== 'object' || errors === null) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

// The server sets the XSRF-TOKEN cookie on any response, and expects its value back in the
// X-XSRF-TOKEN header on every POST, PUT, PATCH and DELETE (ADR 0004)
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCsrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : undefined
}

async function csrfToken(): Promise<string | undefined> {
  const existing = readCsrfToken()
  if (existing) {
    return existing
  }
  // No call has reached the server yet in this browser: any GET makes it set the cookie
  await fetch('/api/health', { headers: { Accept: 'application/json' } }).catch(() => undefined)
  return readCsrfToken()
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
 * `path` is always relative, such as /api/health, so the browser sees one origin (ADR 0004):
 * in development Vite proxies /api to the local server, and on Railway the client's Caddyfile does.
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
  if (typeof init?.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (UNSAFE_METHODS.has((init?.method ?? 'GET').toUpperCase())) {
    const token = await csrfToken()
    if (token) {
      headers.set('X-XSRF-TOKEN', token)
    }
  }

  let response: Response
  try {
    response = await fetch(path, { ...init, headers })
  } catch (cause) {
    // A canceled request is not an error to show: let the caller ignore it
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    // fetch only rejects when there is no response at all: network down, DNS
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
      fieldErrors: readFieldErrors(body),
      problem: body,
    })
  }

  throw systemError(response.status)
}
