import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request, SYSTEM_ERROR_MESSAGE } from './http'

type Status = { status: string }

const parseStatus = (data: unknown): Status => {
  if (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    typeof data.status === 'string'
  ) {
    return { status: data.status }
  }
  throw new Error('Unexpected body')
}

const jsonResponse = (body: unknown, status: number, contentType = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('request', () => {
  it('returns the parsed body when the call succeeds', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'UP' }, 200))

    await expect(request('/api/health', parseStatus)).resolves.toEqual({ status: 'UP' })
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything())
  })

  it('turns a ProblemDetail into a business error that shows its detail', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Invalid verification code',
          status: 422,
          detail: 'The code does not match. Check the SMS and try again.',
          code: 'VERIFICATION_CODE_INVALID',
        },
        422,
        'application/problem+json',
      ),
    )

    const result = request('/api/phone-verifications/1/check', parseStatus)

    await expect(result).rejects.toBeInstanceOf(ApiError)
    await expect(result).rejects.toMatchObject({
      kind: 'business',
      status: 422,
      code: 'VERIFICATION_CODE_INVALID',
      message: 'The code does not match. Check the SMS and try again.',
    })
  })

  it('turns a network failure into a system error with a generic message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/api/health', parseStatus)).rejects.toMatchObject({
      kind: 'system',
      message: SYSTEM_ERROR_MESSAGE,
    })
  })
})
