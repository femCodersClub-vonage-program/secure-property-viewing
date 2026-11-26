import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { openCheckUrl } from '../silentAuth'
import PhoneVerification from './PhoneVerification'

// jsdom cannot leave the page, so opening the check URL is recorded instead
vi.mock('../silentAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../silentAuth')>()),
  openCheckUrl: vi.fn(),
}))

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
const RESEND_TOO_SOON = 'Wait a moment before asking for a new code.'
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

// vi.waitFor doesn't follow the asyncUtilTimeout of test-setup.ts, and its default is one second
const waitUntil = (callback: () => void) => vi.waitFor(callback, { timeout: 5000 })

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
  vi.restoreAllMocks()
  vi.mocked(openCheckUrl).mockReset()
  sessionStorage.clear()
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
  // The countdown starts in an effect: moving the clock before it exists would skip it
  await waitUntil(() => expect(vi.getTimerCount()).toBeGreaterThan(0))
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
// waitUntil, not waitFor: moving the focus changes no DOM, and setInterval is faked here
async function expectFocusOnTheMessage() {
  await waitUntil(() => {
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toContainElement(screen.getByRole('alert'))
  })
}

describe('PhoneVerification', () => {
  it('says what the number is used for, and sends it in international format without spaces', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAccessibleDescription(
      'Such as +34 600 000 000. Used to confirm your visit and send you its messages.',
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
      'Such as +34 600 000 000. Used to confirm your listing request and send you its updates.',
    )

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'LISTING_REQUEST' })
    // Typed without spaces, it is still shown in groups, so it is easy to check
    expect(screen.getByRole('status')).toHaveTextContent('+34 600 000 000.')
  })

  it('starts with the initialPhone, and sends the number the person changes it to', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(
      <PhoneVerification
        purpose="LISTING_REQUEST"
        initialPhone="+34612987654"
        onVerified={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+34612987654')

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'LISTING_REQUEST' })
  })

  it('starts with an empty phone number without an initialPhone', () => {
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('')
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

  it('follows the resendAvailableAt of each answer, not a fixed wait', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ ...startedFromSpec, resendAvailableAt: '2026-11-10T11:00:45+01:00' }, 201),
      )
      .mockResolvedValueOnce(
        json({ id: 43, status: 'PENDING', resendAvailableAt: '2026-11-10T11:01:45+01:00' }, 201),
      )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    expect(screen.getByText('You can ask for a new code in 45 s.')).toBeInTheDocument()
    passTime(32_000)
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeDisabled()
    passTime(13_000)
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }))

    expect(await screen.findByText('You can ask for a new code in 60 s.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeDisabled()
  })

  it('shows the general error when the server fails without an explanation', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(500, 'INTERNAL_ERROR', 'Something went wrong on our side.'),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '+34600000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
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
    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Change the number' }))
    await waitUntil(() =>
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
      .mockResolvedValueOnce(json(checkedFromSpec, 200))
    const onVerified = vi.fn()
    render(<PhoneVerification purpose="VISIT" onVerified={onVerified} />)
    await sendCodeTo('+34600000000')

    fireEvent.change(screen.getByRole('textbox', { name: 'Code from the SMS' }), {
      target: { value: '111111' },
    })
    // A keyboard user presses Verify, which is disabled while the code is checked
    const verify = screen.getByRole('button', { name: 'Verify' })
    verify.focus()
    fireEvent.click(verify)

    const field = await screen.findByRole('textbox', { name: 'Code from the SMS' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(new RegExp(CODE_INVALID))
    await waitUntil(() => expect(field).toHaveFocus())

    typeCode('482931')
    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith({ verificationId: 42, phone: '+34600000000' }),
    )
  })

  it('shows a server failure while checking as a message, and leaves the code field as it was', async () => {
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(problem(500, 'INTERNAL_ERROR', 'Something went wrong on our side.'))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')

    typeCode('482931')

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    await expectFocusOnTheMessage()
    const field = screen.getByRole('textbox', { name: 'Code from the SMS' })
    expect(field).not.toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveValue('482931')
    expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled()
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
    await waitUntil(() =>
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
    const sendButton = screen.getByRole('button', { name: 'Send code' })
    sendButton.focus()
    fireEvent.click(sendButton)

    const field = screen.getByRole('textbox', { name: 'Phone number' })
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(field).toHaveAccessibleDescription(/must be a phone number in international format/)
    await waitUntil(() => expect(field).toHaveFocus())
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

// Shaped as in specs/silent-authentication.md, "API"
const CHECK_URL =
  'https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect'
const startedWithCheckUrl = { ...startedFromSpec, checkUrl: CHECK_URL }
const visitForm = { propertyId: 7, visitorName: 'Laura Gómez', slot: { id: 302 } }

function savedCheck(phone = '+34600000000') {
  return {
    saved: {
      verificationId: 42,
      purpose: 'VISIT' as const,
      phone,
      resendAvailableAt: startedFromSpec.resendAvailableAt,
      form: visitForm,
    },
    result: { outcome: 'none' as const },
  }
}

function silentCodeBack(phone?: string) {
  return {
    ...savedCheck(phone),
    result: { outcome: 'code' as const, requestId: 'c11236f4', code: 'si9sfG' },
  }
}

// As a phone's browser answers the media query the spec uses when userAgentData is missing
function useAPhoneBrowser() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: query === '(pointer: coarse)' })),
  )
}

function sendNumber(phone: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
    target: { value: phone },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
}

describe('PhoneVerification with Silent Authentication', () => {
  it('from a phone, saves the form without any code and opens the check URL in the same tab', async () => {
    useAPhoneBrowser()
    fetchMock.mockResolvedValueOnce(json(startedWithCheckUrl, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    sendNumber('+34 600 000 000')

    await waitUntil(() => expect(openCheckUrl).toHaveBeenCalledWith(CHECK_URL))
    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT', silentAuth: true })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your number with your mobile operator…',
    )
    // The form and its button are gone, so the focus must not fall back to the page body
    await waitUntil(() =>
      expect(screen.getByRole('heading', { name: 'Checking your number' })).toHaveFocus(),
    )
    expect(JSON.parse(sessionStorage.getItem('peephole.silent-check') ?? 'null')).toEqual({
      verificationId: 42,
      purpose: 'VISIT',
      phone: '+34600000000',
      resendAvailableAt: startedFromSpec.resendAvailableAt,
      form: visitForm,
    })
  })

  it('tries the silent check for a +990 number from a computer too', async () => {
    fetchMock.mockResolvedValueOnce(json(startedWithCheckUrl, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    sendNumber('+990123400')

    await waitUntil(() => expect(openCheckUrl).toHaveBeenCalled())
    expect(sentBody(0)).toEqual({ phone: '+990123400', purpose: 'VISIT', silentAuth: true })
  })

  it('never asks for the silent check from a computer, or when the page has no form to keep', async () => {
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    const { unmount } = render(
      <PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />,
    )
    await sendCodeTo('+34600000000')
    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
    unmount()

    useAPhoneBrowser()
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} />)
    await sendCodeTo('+34600000000')
    expect(sentBody(1)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
  })

  it('shows the SMS code entry as today when the answer has no checkUrl', async () => {
    useAPhoneBrowser()
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT', silentAuth: true })
    expect(openCheckUrl).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('peephole.silent-check')).toBeNull()
    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
  })

  it('asks for a new code by SMS only, as the spec says once the SMS step has started', async () => {
    useAPhoneBrowser()
    fetchMock
      .mockResolvedValueOnce(json(startedFromSpec, 201))
      .mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)
    await sendCodeTo('+34600000000')

    passTime(32_000)
    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }))

    await waitUntil(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(sentBody(1)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
  })

  it('moves on to the SMS code when the page comes back from the back/forward cache', async () => {
    useAPhoneBrowser()
    fetchMock
      .mockResolvedValueOnce(json(startedWithCheckUrl, 201))
      .mockResolvedValueOnce(json({ id: 42, status: 'PENDING' }, 200))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)
    sendNumber('+34600000000')
    // act, because the check URL opens before React listens to the page coming back
    await act(() => waitUntil(() => expect(openCheckUrl).toHaveBeenCalled()))

    // A first load is not a page restored from the cache, so it does nothing
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))

    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/phone-verifications/42/sms-fallback')
    expect(sessionStorage.getItem('peephole.silent-check')).toBeNull()
  })

  it('goes straight to the SMS code when the browser does not let it save the form', async () => {
    useAPhoneBrowser()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    fetchMock
      .mockResolvedValueOnce(json(startedWithCheckUrl, 201))
      .mockResolvedValueOnce(json({ id: 42, status: 'PENDING' }, 200))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    sendNumber('+34600000000')

    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(openCheckUrl).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/phone-verifications/42/sms-fallback')
  })

  it('checks the code the operator sent back once, and hands over the verified phone', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 42, status: 'VERIFIED' }, 200))
    const onVerified = vi.fn()
    const resumed = silentCodeBack()
    sessionStorage.setItem('peephole.silent-check', JSON.stringify(resumed.saved))

    // StrictMode runs effects twice, as React does in development
    render(
      <StrictMode>
        <PhoneVerification purpose="VISIT" onVerified={onVerified} resumed={resumed} />
      </StrictMode>,
    )

    await waitUntil(() =>
      expect(onVerified).toHaveBeenCalledWith({ verificationId: 42, phone: '+34600000000' }),
    )
    // Vonage checks the silent code only once, so a second call would always fail
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/phone-verifications/42/silent-check')
    expect(sentBody(0)).toEqual({ requestId: 'c11236f4', code: 'si9sfG' })
    expect(sessionStorage.getItem('peephole.silent-check')).toBeNull()
  })

  it('shows the SMS code entry when Verify rejects the silent code of a real number', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(422, 'VERIFICATION_CODE_INVALID', 'The code does not match.'),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} resumed={silentCodeBack()} />)

    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "We've sent a 6-digit code by SMS to +34 600 000 000.",
    )
  })

  it('says a +990 number could not be verified and moves the focus to start again', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 42, status: 'FAILED' }, 200))
    render(
      <PhoneVerification
        purpose="VISIT"
        onVerified={vi.fn()}
        resumed={silentCodeBack('+990123499')}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your mobile operator couldn't confirm this number. Check it and start again.",
    )
    const startAgain = screen.getByRole('button', { name: 'Start again' })
    await waitUntil(() => expect(startAgain).toHaveFocus())
    expect(screen.queryByRole('button', { name: 'Send a new code' })).not.toBeInTheDocument()

    fireEvent.click(startAgain)
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+990123499')
  })

  it('never offers a new code to a +990 number whose verification has expired', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 42, status: 'EXPIRED' }, 200))
    render(
      <PhoneVerification purpose="VISIT" onVerified={vi.fn()} resumed={savedCheck('+990123400')} />,
    )

    expect(await screen.findByRole('button', { name: 'Start again' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send a new code' })).not.toBeInTheDocument()
  })

  it('keeps the SMS code entry open and says what went wrong when the server fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} resumed={savedCheck()} />)

    expect(await screen.findByRole('textbox', { name: 'Code from the SMS' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
  })
})

describe('PhoneVerification, telling a phone and following the check URL', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'userAgentData')
  })

  function browserSays(mobile: boolean) {
    Object.defineProperty(navigator, 'userAgentData', { value: { mobile }, configurable: true })
  }

  it('trusts userAgentData over the media query, so a touchscreen laptop gets the SMS', async () => {
    browserSays(false)
    useAPhoneBrowser()
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT' })
  })

  it('asks for the silent check when userAgentData says it is a phone', async () => {
    browserSays(true)
    fetchMock.mockResolvedValueOnce(json(startedFromSpec, 201))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    await sendCodeTo('+34600000000')

    expect(sentBody(0)).toEqual({ phone: '+34600000000', purpose: 'VISIT', silentAuth: true })
  })

  it('never follows a check URL that is not HTTPS, and shows the SMS code entry', async () => {
    useAPhoneBrowser()
    fetchMock.mockResolvedValueOnce(
      json({ ...startedFromSpec, checkUrl: 'javascript:alert(1)' }, 201),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} formToKeep={visitForm} />)

    await sendCodeTo('+34600000000')

    expect(openCheckUrl).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('peephole.silent-check')).toBeNull()
  })
})

describe('PhoneVerification, errors from the silent check', () => {
  it('shows the SMS code entry without an alert when the verification already moved on to SMS', async () => {
    fetchMock.mockResolvedValueOnce(
      problem(409, 'VERIFICATION_SILENT_CHECK_UNAVAILABLE', 'It already moved on to SMS.'),
    )
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} resumed={silentCodeBack()} />)

    await waitUntil(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    [404, 'VERIFICATION_NOT_FOUND', NOT_FOUND],
    [422, 'VERIFICATION_EXPIRED', EXPIRED],
  ])('offers a new code for a real number after a %i %s', async (status, code, detail) => {
    fetchMock.mockResolvedValueOnce(problem(status, code, detail))
    render(<PhoneVerification purpose="VISIT" onVerified={vi.fn()} resumed={silentCodeBack()} />)

    expect(
      await screen.findByRole('heading', { name: "Let's send you a new code" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(detail)
    await expectFocusOnTheMessage()
  })

  it.each([
    [404, 'VERIFICATION_NOT_FOUND', NOT_FOUND],
    [422, 'VERIFICATION_EXPIRED', EXPIRED],
  ])('offers to start again for a +990 number after a %i %s', async (status, code, detail) => {
    fetchMock.mockResolvedValueOnce(problem(status, code, detail))
    render(
      <PhoneVerification
        purpose="VISIT"
        onVerified={vi.fn()}
        resumed={silentCodeBack('+990123400')}
      />,
    )

    const startAgain = await screen.findByRole('button', { name: 'Start again' })
    await waitUntil(() => expect(startAgain).toHaveFocus())
    expect(screen.queryByRole('button', { name: 'Send a new code' })).not.toBeInTheDocument()
  })
})
