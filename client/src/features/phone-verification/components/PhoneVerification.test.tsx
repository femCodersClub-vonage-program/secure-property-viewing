import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhoneVerification from './PhoneVerification'

// Copied as-is from specs/phone-verification.md, "API"
const startedFromSpec = {
  id: 42,
  status: 'PENDING',
  resendAvailableAt: '2026-11-10T11:00:30+01:00',
}
const checkedFromSpec = { id: 42, status: 'VERIFIED' }

// The moment the code is sent: 30 seconds before resendAvailableAt in the spec example
const SENT_AT = new Date('2026-11-10T11:00:00+01:00')

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

const problem = (status: number, code: string, detail: string, errors?: Record<string, string>) =>
  json({ title: 'Error', status, detail, code, errors }, status)

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(SENT_AT)
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=test-token; path=/'
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

const sentBody = (call: number): unknown => {
  const body = fetchMock.mock.calls[call]?.[1]?.body
  return typeof body === 'string' ? JSON.parse(body) : undefined
}

async function sendCodeTo(phone: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
    target: { value: phone },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
  await screen.findByRole('textbox', { name: 'Code from the SMS' })
}

function typeCode(code: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Code from the SMS' }), {
    target: { value: code },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
}

describe('PhoneVerification', () => {
  it('says what the number is used for, and sends it in international format without spaces', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAccessibleDescription(
      /to confirm your visit and to send you its messages/,
    )

    await sendCodeTo('+34 600 000 000')

    expect(fetchMock).toHaveBeenCalledWith('/api/phone-verifications', expect.anything())
    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
    expect(screen.getByRole('status')).toHaveTextContent(
      "We've sent a 6-digit code by SMS to +34600000000.",
    )
  })

  it('hands the verified phone to the page once the code matches', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(json(checkedFromSpec, 200))
    const onVerified = vi.fn()
    render(<PhoneVerification purpose="VISIT" onVerified={onVerified} />)

    await sendCodeTo('+34600000000')
    typeCode('482931')

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith({ verificationId: 42, phone: '+34600000000' }),
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/phone-verifications/42/check',
      expect.anything(),
    )
    expect(sentBody(1)).toEqual({ code: '482931' })
  })

  it('keeps the new code button disabled with a countdown until resendAvailableAt', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    expect(screen.getByRole('button', { name: 'Send a new code in 30 s' })).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
  })

  it('shows a wrong code next to the field, so the person can try again', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(
        problem(
          422,
          'VERIFICATION_CODE_INVALID',
          'The code does not match. Check the SMS and try again.',
        ),
      )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    typeCode('111111')

    const field = await screen.findByRole('textbox', { name: 'Code from the SMS' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(
      /The code does not match. Check the SMS and try again./,
    )
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument()
  })

  it('offers only a new code once the verification has expired', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(
        problem(422, 'VERIFICATION_EXPIRED', 'The code has expired. Ask for a new one.'),
      )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    typeCode('482931')

    expect(await screen.findByText('The code has expired. Ask for a new one.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
  })

  it('shows the server message next to the phone field when the number is not valid', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        phone: 'must be a phone number in international format, such as +34600000000',
      }),
    )
    render(<PhoneVerification purpose="LISTING_REQUEST" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '600' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    const field = screen.getByRole('textbox', { name: 'Phone number' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(/must be a phone number in international format/)
  })

  it('explains the hourly limit when it is reached', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(
        429,
        'VERIFICATION_LIMIT_REACHED',
        'Too many codes for this number. Try again in an hour.',
      ),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '+34600000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(
      await screen.findByText('Too many codes for this number. Try again in an hour.'),
    ).toBeInTheDocument()
  })
})
