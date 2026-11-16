import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhoneVerification from './PhoneVerification'

// Copied as-is from specs/phone-verification.md, "API"
const startedFromSpec = {
  id: 42,
  status: 'PENDING',
  resendAvailableAt: '2026-11-10T11:00:32+01:00',
}
const checkedFromSpec = { id: 42, status: 'VERIFIED' }

// The moment the code is sent: 32 seconds before resendAvailableAt in the spec example
const SENT_AT = new Date('2026-11-10T11:00:00+01:00')

// The detail texts are the ones the server sends, from the exceptions in server/.../phoneverification/
const EXPIRED = 'The code has expired. Ask for a new code.'
const TOO_MANY_ATTEMPTS = 'You entered a wrong code too many times. Ask for a new code.'
const RESEND_TOO_SOON =
  'Wait until you can ask for a new code, as the countdown on the screen shows.'
const LIMIT_REACHED = 'Too many codes have been sent. Try again in an hour.'
const NOT_FOUND = 'This verification was not found. Ask for a new code.'
const IN_PROGRESS = 'A code is already on its way to this number. Wait a few minutes and try again.'
const CODE_INVALID = 'The code does not match. Check the SMS and try again.'

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

function passTime(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds)
  })
}

// The body also contains the message, so check that the focus did not fall back to it.
// vi.waitFor, not waitFor: moving the focus changes no DOM, and setInterval is faked here
async function expectFocusOnTheMessage() {
  await vi.waitFor(() => {
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toContainElement(screen.getByRole('alert'))
  })
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
      "We've sent a 6-digit code by SMS to +34 600 000 000.",
    )
  })

  it('sends LISTING_REQUEST and says the number confirms the listing request', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="LISTING_REQUEST" onVerified={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAccessibleDescription(
      /to confirm your listing request/,
    )

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'LISTING_REQUEST' })
    // Typed without spaces, it is still shown in groups, so it is easy to check
    expect(screen.getByRole('status')).toHaveTextContent('+34 600 000 000.')
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

  it('counts down to resendAvailableAt from the server before offering a new code', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    expect(screen.getByText('You can ask for a new code in 32 s.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeDisabled()

    passTime(30_000)
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeDisabled()

    passTime(2_000)
    expect(screen.queryByText(/You can ask for a new code/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
  })

  it('checks the new verification after asking for a new code', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(
        json({ id: 43, status: 'PENDING', resendAvailableAt: '2026-11-10T11:01:04+01:00' }, 201),
      )
      .mockResolvedValueOnce(json({ id: 43, status: 'VERIFIED' }, 200))
    const onVerified = vi.fn()
    render(<PhoneVerification purpose="VISIT" onVerified={onVerified} />)
    await sendCodeTo('+34600000000')
    passTime(32_000)

    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/a new 6-digit code/))
    typeCode('482931')

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith({ verificationId: 43, phone: '+34600000000' }),
    )
    expect(sentBody(1)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/phone-verifications/43/check',
      expect.anything(),
    )
  })

  it('moves the focus to the code field once the code is sent, and back to the phone field to change it', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    await sendCodeTo('+34600000000')
    await vi.waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Change the number' }))
    await vi.waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus(),
    )
  })

  it('keeps the six digits of a code pasted with a space', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    fireEvent.change(screen.getByRole('textbox', { name: 'Code from the SMS' }), {
      target: { value: '482 931' },
    })

    expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveValue('482931')
  })

  it('asks for the missing digits instead of calling the server', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    typeCode('4829')

    expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveAccessibleDescription(
      /Enter the 6 digits from the SMS./,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks for a number when the field is empty, without calling the server', () => {
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAccessibleDescription(
      /Enter your phone number in international format/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a wrong code next to the field, so the person can try again', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(problem(422, 'VERIFICATION_CODE_INVALID', CODE_INVALID))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    typeCode('111111')

    const field = await screen.findByRole('textbox', { name: 'Code from the SMS' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(new RegExp(CODE_INVALID))
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument()
  })

  it.each([
    ['VERIFICATION_EXPIRED', 422, EXPIRED],
    ['VERIFICATION_TOO_MANY_ATTEMPTS', 429, TOO_MANY_ATTEMPTS],
    ['VERIFICATION_NOT_FOUND', 404, NOT_FOUND],
  ])(
    'offers only a new code after %s, with the focus on the message',
    async (code, status, detail) => {
      fetchMock
        .mockResolvedValueOnce(json(startedFromSpec, 201))
        .mockResolvedValueOnce(problem(status, code, detail))
      render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
      await sendCodeTo('+34600000000')
      passTime(32_000)

      typeCode('482931')

      expect(await screen.findByRole('alert')).toHaveTextContent(detail)
      await expectFocusOnTheMessage()
      expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
    },
  )

  it('keeps the new code button disabled after too many attempts until the countdown ends', async () => {
    let answerNewCode: (response: Response) => void = () => {}
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(problem(429, 'VERIFICATION_TOO_MANY_ATTEMPTS', TOO_MANY_ATTEMPTS))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          answerNewCode = resolve
        }),
      )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')
    typeCode('111111')

    expect(await screen.findByRole('alert')).toHaveTextContent(TOO_MANY_ATTEMPTS)
    expect(screen.getByText('You can ask for a new code in 32 s.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeDisabled()

    passTime(32_000)
    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    answerNewCode(
      json({ id: 43, status: 'PENDING', resendAvailableAt: '2026-11-10T11:01:04+01:00' }, 201),
    )
    await vi.waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
  })

  it('keeps the current code usable when a new one is asked for too soon', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(problem(429, 'VERIFICATION_RESEND_TOO_SOON', RESEND_TOO_SOON))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')
    passTime(32_000)

    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(RESEND_TOO_SOON)
    await expectFocusOnTheMessage()
    expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument()
  })

  it('shows the server message next to the phone field when the number is not valid', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(400, 'VALIDATION_FAILED', 'One or more fields are invalid.', {
        phone: 'must be a phone number in international format, such as +34600000000',
      }),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '600' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    const field = screen.getByRole('textbox', { name: 'Phone number' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(/must be a phone number in international format/)
  })

  it.each([
    ['VERIFICATION_LIMIT_REACHED', 429, LIMIT_REACHED],
    ['VERIFICATION_IN_PROGRESS', 409, IN_PROGRESS],
  ])('explains %s and stays on the phone step', async (code, status, detail) => {
    fetchMock.mockResolvedValueOnce(problem(status, code, detail))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '+34600000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(detail)
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
  })
})
