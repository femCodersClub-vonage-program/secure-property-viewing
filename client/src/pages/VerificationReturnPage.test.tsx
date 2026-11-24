import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openCheckUrl } from '../features/phone-verification/silentAuth'
import { routes } from '../routes'

// jsdom cannot leave the page, so opening the check URL is recorded instead
vi.mock('../features/phone-verification/silentAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/phone-verification/silentAuth')>()),
  openCheckUrl: vi.fn(),
}))

// The silent check from specs/silent-authentication.md, end to end through the routes: the
// operator's redirect lands on /verification/return, which sends the person back to their visit

const NOW = new Date('2026-11-17T09:00:00+01:00')

const propertyFromSpec = {
  id: 7,
  title: 'Apartment in Gràcia',
  operation: 'RENT',
  priceEuros: 950,
  area: 'Gràcia',
  bedrooms: 2,
  agency: { name: 'Demo agency', verified: true },
  images: [],
}

const slot = {
  id: 302,
  startsAt: '2026-11-18T10:30:00+01:00',
  endsAt: '2026-11-18T11:00:00+01:00',
}

const bookedFromSpec = {
  visitId: 18,
  startsAt: slot.startsAt,
  endsAt: slot.endsAt,
  visitorName: 'Laura Gómez',
  property: {
    title: 'Apartment in Gràcia',
    area: 'Gràcia',
    address: 'Fictional demo address 01, Barcelona',
  },
}

const STORAGE_KEY = 'peephole.silent-check'

function saveCheck({ phone = '+34600000000', propertyId = 7 } = {}) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      verificationId: 42,
      purpose: 'VISIT',
      phone,
      resendAvailableAt: '2026-11-17T09:00:32+01:00',
      form: { propertyId, visitorName: 'Laura Gómez', slot },
    }),
  )
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

type Answer = () => Response
const fetchMock = vi.fn<typeof fetch>()
let answers: Record<string, Answer[]> = {}

function serve(key: string, ...responses: Answer[]) {
  answers[key] = [...(answers[key] ?? []), ...responses]
}

function callsTo(key: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) => `${(init?.method ?? 'GET').toUpperCase()} ${String(input)}` === key,
  )
}

function bodyOf(call: Parameters<typeof fetch> | undefined): unknown {
  const body = call?.[1]?.body
  return typeof body === 'string' ? JSON.parse(body) : undefined
}

function serveCalendar() {
  serve('GET /api/properties/7', () => json(propertyFromSpec, 200))
  serve('GET /api/properties/7/slots', () => json([slot], 200))
}

function renderAt(entry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  answers = {}
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${String(input)}`
    const answer = answers[key]?.shift()
    if (!answer) throw new Error(`No answer prepared for ${key}`)
    return answer()
  })
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=test-token; path=/'
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  vi.mocked(openCheckUrl).mockReset()
  sessionStorage.clear()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('coming back from the silent check', () => {
  it('books the visit with the time and name kept from before, with nothing to type', async () => {
    saveCheck()
    serveCalendar()
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/visits', () => json(bookedFromSpec, 201))
    serve('POST /api/visits/18/room-links', () => json({ role: 'VISITOR', token: 'abc' }, 201))

    const router = renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your video visit is booked' }),
    ).toBeInTheDocument()
    expect(bodyOf(callsTo('POST /api/phone-verifications/42/silent-check')[0])).toEqual({
      requestId: 'c11236f4',
      code: 'si9sfG',
    })
    expect(bodyOf(callsTo('POST /api/visits')[0])).toEqual({
      slotId: 302,
      visitorName: 'Laura Gómez',
      phone: '+34600000000',
      phoneVerificationId: 42,
    })
    expect(router.state.location.pathname).toBe('/visits/18/confirmation')
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('removes the single-use code from the address bar once it has been read', async () => {
    saveCheck()
    serveCalendar()
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'PENDING' }, 200),
    )

    const router = renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    await screen.findByRole('textbox', { name: 'Code from the SMS' })
    expect(router.state.location.pathname).toBe('/properties/7/visit')
    expect(router.state.location.hash).toBe('')
  })

  it('shows the SMS code entry for the same visit when the operator sends an error back', async () => {
    saveCheck()
    serveCalendar()
    serve('POST /api/phone-verifications/42/sms-fallback', () =>
      json({ id: 42, status: 'PENDING' }, 200),
    )

    // 20 seconds after the start: the countdown goes on from the saved time, it does not restart
    vi.setSystemTime(new Date('2026-11-17T09:00:20+01:00'))

    renderAt('/verification/return#error_description=Device%20MSISDN%20does%20not%20match.')

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(callsTo('POST /api/phone-verifications/42/sms-fallback')).toHaveLength(1)
    expect(screen.getByText('You can ask for a new code in 12 s.')).toBeInTheDocument()
    expect(
      screen.getByText('Apartment in Gràcia: Wednesday 18 November, from 10:30 to 11:00.'),
    ).toBeInTheDocument()
  })

  it('asks for the SMS code when the visitor comes back with the back button, without a result', async () => {
    saveCheck()
    serveCalendar()
    serve('POST /api/phone-verifications/42/sms-fallback', () =>
      json({ id: 42, status: 'PENDING' }, 200),
    )

    renderAt('/properties/7/visit')

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Code from the SMS' })).toHaveFocus(),
    )
    expect(callsTo('POST /api/phone-verifications/42/sms-fallback')).toHaveLength(1)
  })

  it('offers to start again when a +990 number could not be verified', async () => {
    saveCheck({ phone: '+990123499' })
    serveCalendar()
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'FAILED' }, 200),
    )

    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your mobile operator couldn't confirm this number.",
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start again' })).toHaveFocus())
    expect(callsTo('POST /api/visits')).toHaveLength(0)
  })

  it('never trusts a broken saved form, and says the verification was not found', async () => {
    sessionStorage.setItem(STORAGE_KEY, '{"verificationId":"42","form":')

    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find your verification" }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('never restores a saved form whose content is broken, even when it is valid JSON', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        verificationId: 42,
        purpose: 'VISIT',
        phone: '+34600000000',
        resendAvailableAt: '2026-11-17T09:00:32+01:00',
        form: { propertyId: 7, visitorName: 'Laura Gómez', slot: { id: 302 } },
      }),
    )

    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find your verification" }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('asks for the SMS code when the fragment brings a request id without its code', async () => {
    saveCheck()
    serveCalendar()
    serve('POST /api/phone-verifications/42/sms-fallback', () =>
      json({ id: 42, status: 'PENDING' }, 200),
    )

    renderAt('/verification/return#request_id=c11236f4')

    expect(await screen.findByRole('textbox', { name: 'Code from the SMS' })).toBeInTheDocument()
    expect(callsTo('POST /api/phone-verifications/42/silent-check')).toHaveLength(0)
    expect(callsTo('POST /api/phone-verifications/42/sms-fallback')).toHaveLength(1)
  })

  it('ignores and deletes a form saved for another property', async () => {
    saveCheck({ propertyId: 9 })
    serveCalendar()

    renderAt('/properties/7/visit')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a time for your video visit' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('')
    await waitFor(() => expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull())
    expect(callsTo('POST /api/phone-verifications/42/sms-fallback')).toHaveLength(0)
  })

  it('finishes the verification even when the kept time, the last free one, was taken meanwhile', async () => {
    saveCheck()
    serve('GET /api/properties/7', () => json(propertyFromSpec, 200))
    serve('GET /api/properties/7/slots', () => json([], 200))
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/visits', () =>
      json({ title: 'Conflict', status: 409, detail: 'Taken', code: 'SLOT_UNAVAILABLE' }, 409),
    )

    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No free times in the next 14 days' }),
    ).toBeInTheDocument()
    expect(callsTo('POST /api/visits')).toHaveLength(1)
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('from the calendar to the operator and back', () => {
  it('saves exactly what the return needs, so the visit is booked with the chosen time and name', async () => {
    // A phone's browser, as the media query the spec uses when userAgentData is missing tells it
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(pointer: coarse)' })),
    )
    serveCalendar()
    serve('POST /api/phone-verifications', () =>
      json(
        {
          id: 42,
          status: 'PENDING',
          resendAvailableAt: '2026-11-17T09:00:32+01:00',
          checkUrl: 'https://api.nexmo.com/v2/verify/c11236f4/silent-auth/redirect',
        },
        201,
      ),
    )
    renderAt('/properties/7/visit')

    fireEvent.click(await screen.findByRole('button', { name: 'Wednesday 18 November, 10:30' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), {
      target: { value: 'Laura Gómez' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.change(await screen.findByRole('textbox', { name: 'Phone number' }), {
      target: { value: '+34600000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await waitFor(() =>
      expect(openCheckUrl).toHaveBeenCalledWith(
        'https://api.nexmo.com/v2/verify/c11236f4/silent-auth/redirect',
      ),
    )
    // Opening the check URL reloads the page: only what was saved survives
    cleanup()

    serveCalendar()
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/visits', () => json(bookedFromSpec, 201))
    serve('POST /api/visits/18/room-links', () => json({ role: 'VISITOR', token: 'abc' }, 201))
    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your video visit is booked' }),
    ).toBeInTheDocument()
    expect(bodyOf(callsTo('POST /api/visits')[0])).toEqual({
      slotId: 302,
      visitorName: 'Laura Gómez',
      phone: '+34600000000',
      phoneVerificationId: 42,
    })
  })
})
