import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { routes } from '../../../routes'
import VisitBooking from './VisitBooking'

// A Tuesday morning in Madrid: the next 14 days end on Tuesday 1 December
const NOW = new Date('2026-11-17T09:00:00+01:00')

// Copied from specs/property-browsing.md, "API"
const propertyFromSpec = {
  id: 7,
  title: 'Apartment in Gràcia',
  operation: 'RENT',
  propertyType: 'APARTMENT',
  priceEuros: 950,
  area: 'Gràcia',
  bedrooms: 2,
  sizeM2: 70,
  floor: 2,
  description: '...',
  videoVisitAvailable: true,
  agency: { name: 'Demo agency', verified: true },
  images: [],
}

// Shaped as in specs/visit-booking.md, "API". One slot comes in UTC, to check it is shown in Madrid time
const slotsFromSpec = [
  { id: 301, startsAt: '2026-11-18T10:00:00+01:00', endsAt: '2026-11-18T10:30:00+01:00' },
  { id: 302, startsAt: '2026-11-18T10:30:00+01:00', endsAt: '2026-11-18T11:00:00+01:00' },
  { id: 303, startsAt: '2026-11-19T10:30:00Z', endsAt: '2026-11-19T11:00:00Z' },
  { id: 304, startsAt: '2026-11-19T17:00:00+01:00', endsAt: '2026-11-19T17:30:00+01:00' },
  { id: 305, startsAt: '2026-12-01T10:00:00+01:00', endsAt: '2026-12-01T10:30:00+01:00' },
]

const bookedFromSpec = {
  visitId: 18,
  startsAt: '2026-11-18T10:30:00+01:00',
  endsAt: '2026-11-18T11:00:00+01:00',
  visitorName: 'Laura Gómez',
  property: {
    title: 'Apartment in Gràcia',
    area: 'Gràcia',
    address: 'Fictional demo address 01, Barcelona',
  },
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

const problem = (status: number, code: string, detail: string) =>
  json({ title: 'Error', status, detail, code }, status)

type Answer = () => Response
const fetchMock = vi.fn<typeof fetch>()
let answers: Record<string, Answer[]> = {}

// Each call takes the next answer for its method and path, so a test lists what the server says
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
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

function serveCalendar(slots: unknown = slotsFromSpec) {
  serve('GET /api/properties/7', () => json(propertyFromSpec, 200))
  serve('GET /api/properties/7/slots', () => json(slots, 200))
}

function servePhoneVerification() {
  serve('POST /api/phone-verifications', () =>
    json({ id: 42, status: 'PENDING', resendAvailableAt: '2026-11-17T09:00:32+01:00' }, 201),
  )
  serve('POST /api/phone-verifications/42/check', () => json({ id: 42, status: 'VERIFIED' }, 200))
}

function renderBooking(onBooked = vi.fn()) {
  render(
    <MemoryRouter>
      <VisitBooking propertyId={7} onBooked={onBooked} />
    </MemoryRouter>,
  )
  return onBooked
}

async function chooseTimeAndName(time: string, name = 'Laura Gómez') {
  fireEvent.click(await screen.findByRole('button', { name: time }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), { target: { value: name } })
}

async function verifyPhone() {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Phone number' }), {
    target: { value: '+34600000000' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
  fireEvent.change(await screen.findByRole('textbox', { name: 'Code from the SMS' }), {
    target: { value: '482931' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
}

describe('VisitBooking', () => {
  it('shows the property, the month with its free days and the times of the first free day', async () => {
    serveCalendar()
    renderBooking()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a time for your video visit' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Apartment in Gràcia')).toBeInTheDocument()
    expect(screen.getByText('Gràcia · 950 €/month · 2 bedrooms')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wednesday 18 November' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Thursday 19 November' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    // Days without free times are not buttons
    expect(screen.queryByRole('button', { name: /17 November/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Free times on Wednesday 18 November' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wednesday 18 November, 10:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wednesday 18 November, 10:30' })).toBeInTheDocument()
  })

  it('shows the times in Madrid time and splits them into morning and afternoon', async () => {
    serveCalendar()
    renderBooking()

    fireEvent.click(await screen.findByRole('button', { name: 'Thursday 19 November' }))

    expect(screen.getByRole('button', { name: 'Thursday 19 November' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Sent as 10:30 UTC
    expect(screen.getByRole('button', { name: 'Thursday 19 November, 11:30' })).toBeInTheDocument()
    const morning = screen.getByRole('button', { name: 'Morning (1)' })
    const afternoon = screen.getByRole('button', { name: 'Afternoon (1)' })
    expect(morning).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.queryByRole('button', { name: 'Thursday 19 November, 17:00' }),
    ).not.toBeInTheDocument()

    fireEvent.click(afternoon)
    expect(afternoon).toHaveAttribute('aria-pressed', 'true')
    expect(morning).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Thursday 19 November, 17:00' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Thursday 19 November, 11:30' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the chosen time when the visitor looks at the other part of the day', async () => {
    serveCalendar()
    renderBooking()

    fireEvent.click(await screen.findByRole('button', { name: 'Thursday 19 November' }))
    expect(screen.getByText('No time chosen yet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Thursday 19 November, 11:30' }))
    fireEvent.click(screen.getByRole('button', { name: 'Afternoon (1)' }))

    expect(screen.getByText('Thursday 19 November, 11:30')).toBeInTheDocument()
  })

  it('cannot open a part of the day with no free times', async () => {
    serveCalendar()
    renderBooking()

    expect(await screen.findByRole('button', { name: 'Morning (2)' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Afternoon (0)' })).toBeDisabled()
  })

  it('keeps Continue disabled and says what is missing until a time and a name are chosen', async () => {
    serveCalendar()
    renderBooking()

    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    expect(continueButton).toBeDisabled()
    expect(continueButton).toHaveAccessibleDescription(
      'Choose a time and enter your name to continue.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Wednesday 18 November, 10:00' }))
    expect(screen.getByRole('button', { name: 'Wednesday 18 November, 10:00' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(continueButton).toHaveAccessibleDescription('Enter your name to continue.')

    fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), {
      target: { value: '   ' },
    })
    expect(continueButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), {
      target: { value: 'Laura Gómez' },
    })
    expect(continueButton).toBeEnabled()
    expect(continueButton).toHaveAccessibleDescription(
      'Wednesday 18 November, from 10:00 to 10:30.',
    )
  })

  it('shows the free days of the next month when the 14 days cross into it', async () => {
    serveCalendar()
    renderBooking()

    const previous = await screen.findByRole('button', { name: 'Previous month' })
    expect(previous).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday 1 December' }))
    expect(screen.getByRole('button', { name: 'Tuesday 1 December, 10:00' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
  })

  it('books the chosen time once the phone is verified', async () => {
    serveCalendar()
    servePhoneVerification()
    serve('POST /api/visits', () => json(bookedFromSpec, 201))
    const onBooked = renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:30')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      await screen.findByText('Apartment in Gràcia: Wednesday 18 November, from 10:30 to 11:00.'),
    ).toBeInTheDocument()
    await verifyPhone()

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(bookedFromSpec))
    // The page opens the confirmation (A6): until then, the screen still says it is booking
    expect(
      screen.getByRole('heading', { level: 1, name: 'Booking your visit…' }),
    ).toBeInTheDocument()
    expect(bodyOf(callsTo('POST /api/visits')[0])).toEqual({
      slotId: 302,
      visitorName: 'Laura Gómez',
      phone: '+34600000000',
      phoneVerificationId: 42,
    })
  })

  it('moves the focus to the heading of each step, so it never falls back to the page', async () => {
    serveCalendar()
    renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:30')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Confirm your visit' })).toHaveFocus(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to the calendar' }))
    await vi.waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: 'Choose a time for your video visit' }),
      ).toHaveFocus(),
    )
  })

  it('moves the focus to the month shown, since the arrow pressed may become disabled', async () => {
    serveCalendar()
    renderBooking()

    fireEvent.click(await screen.findByRole('button', { name: 'Next month' }))

    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'December 2026' })).toHaveFocus(),
    )
  })

  it('asks for a time when only the name is filled in, and for a new time after changing day', async () => {
    serveCalendar()
    renderBooking()

    fireEvent.change(await screen.findByRole('textbox', { name: 'Your name' }), {
      target: { value: 'Laura Gómez' },
    })
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton).toHaveAccessibleDescription('Choose a time to continue.')

    fireEvent.click(screen.getByRole('button', { name: 'Wednesday 18 November, 10:00' }))
    expect(continueButton).toBeEnabled()

    // A time from a day the visitor has left must never be booked
    fireEvent.click(screen.getByRole('button', { name: 'Thursday 19 November' }))
    expect(continueButton).toBeDisabled()
    expect(continueButton).toHaveAccessibleDescription('Choose a time to continue.')
  })

  it('says it is loading until the free times arrive', async () => {
    serveCalendar()
    renderBooking()

    expect(screen.getByRole('status')).toHaveTextContent('Loading the free times…')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a time for your video visit' }),
    ).toBeInTheDocument()
  })

  it('shows the photo of the property, and calls a property without bedrooms a studio', async () => {
    serve('GET /api/properties/7', () =>
      json(
        {
          ...propertyFromSpec,
          bedrooms: 0,
          images: [{ url: 'https://example.com/studio.webp', altText: 'Studio with a big window' }],
        },
        200,
      ),
    )
    serve('GET /api/properties/7/slots', () => json(slotsFromSpec, 200))
    renderBooking()

    expect(await screen.findByRole('img', { name: 'Studio with a big window' })).toBeInTheDocument()
    expect(screen.getByText('Gràcia · 950 €/month · Studio')).toBeInTheDocument()
  })

  it('keeps the time, the name and the verification when booking fails on the server', async () => {
    serveCalendar()
    servePhoneVerification()
    serve(
      'POST /api/visits',
      () => problem(500, 'INTERNAL_ERROR', 'Boom'),
      () => json(bookedFromSpec, 201),
    )
    const onBooked = renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:30')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await verifyPhone()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.getByRole('button', { name: 'Wednesday 18 November, 10:30' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('Laura Gómez')

    fireEvent.click(screen.getByRole('button', { name: 'Book this time' }))
    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(bookedFromSpec))
    expect(callsTo('POST /api/phone-verifications')).toHaveLength(1)
  })

  it('goes back to the calendar without the taken time, and books another one without a new SMS', async () => {
    serveCalendar()
    servePhoneVerification()
    serve(
      'POST /api/visits',
      () => problem(409, 'SLOT_UNAVAILABLE', 'This time has just been booked.'),
      () => json(bookedFromSpec, 201),
    )
    const onBooked = renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:00')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await verifyPhone()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Someone has just booked Wednesday 18 November at 10:00. Your phone is still verified, so you can book another time straight away.',
    )
    await vi.waitFor(() => expect(document.activeElement).toContainElement(alert))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Choose another time' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Wednesday 18 November, 10:00' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('Laura Gómez')

    fireEvent.click(screen.getByRole('button', { name: 'Wednesday 18 November, 10:30' }))
    fireEvent.click(screen.getByRole('button', { name: 'Book this time' }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(bookedFromSpec))
    expect(bodyOf(callsTo('POST /api/visits')[1])).toMatchObject({
      slotId: 302,
      phoneVerificationId: 42,
    })
    expect(callsTo('POST /api/phone-verifications')).toHaveLength(1)
  })

  it('sends the visitor back to verify her phone when the server rejects the verification', async () => {
    serveCalendar()
    servePhoneVerification()
    serve(
      'POST /api/visits',
      () => problem(422, 'PHONE_VERIFICATION_INVALID', 'Verify your phone number again to book.'),
      () => json(bookedFromSpec, 201),
    )
    serve('POST /api/phone-verifications', () =>
      json({ id: 43, status: 'PENDING', resendAvailableAt: '2026-11-17T09:00:32+01:00' }, 201),
    )
    serve('POST /api/phone-verifications/43/check', () => json({ id: 43, status: 'VERIFIED' }, 200))
    const onBooked = renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:00')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await verifyPhone()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verify your phone number again to book.',
    )
    await verifyPhone()

    await waitFor(() => expect(onBooked).toHaveBeenCalledWith(bookedFromSpec))
    // The rejected verification is never sent again
    expect(bodyOf(callsTo('POST /api/visits')[1])).toMatchObject({ phoneVerificationId: 43 })
  })

  it('keeps the chosen time and name when the visitor goes back from the verification', async () => {
    serveCalendar()
    renderBooking()

    await chooseTimeAndName('Wednesday 18 November, 10:30')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Back to the calendar' }))

    expect(screen.getByRole('button', { name: 'Wednesday 18 November, 10:30' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('textbox', { name: 'Your name' })).toHaveValue('Laura Gómez')
  })

  it('says when there are no free times in the next 14 days', async () => {
    serveCalendar([])
    renderBooking()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No free times in the next 14 days' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See other properties' })).toHaveAttribute('href', '/')
  })

  it('says when the property does not exist or is no longer active', async () => {
    serve('GET /api/properties/7', () => problem(404, 'NOT_FOUND', 'Not found'))
    serve('GET /api/properties/7/slots', () => problem(404, 'NOT_FOUND', 'Not found'))
    renderBooking()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This property is not available' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See other properties' })).toHaveAttribute('href', '/')
  })

  it('shows the general error when the server fails, and loads again on request', async () => {
    serve('GET /api/properties/7', () => problem(500, 'INTERNAL_ERROR', 'Boom'))
    serve('GET /api/properties/7/slots', () => json(slotsFromSpec, 200))
    renderBooking()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(SYSTEM_ERROR_MESSAGE)).toBeInTheDocument()

    serveCalendar()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a time for your video visit' }),
    ).toBeInTheDocument()
  })
})

// The calendar page hands the 201 to the confirmation page (A6), which is the only way it shows
describe('from the calendar to the confirmation', () => {
  it('opens A6 with the booked visit once the booking is confirmed', async () => {
    serveCalendar()
    servePhoneVerification()
    serve('POST /api/visits', () => json(bookedFromSpec, 201))
    serve('POST /api/visits/18/room-links', () => json({ role: 'VISITOR', token: 'abc' }, 201))
    const router = createMemoryRouter(routes, { initialEntries: ['/properties/7/visit'] })
    render(<RouterProvider router={router} />)

    await chooseTimeAndName('Wednesday 18 November, 10:30')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await verifyPhone()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your video visit is booked' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/visits/18/confirmation')
    expect(screen.getByText('Fictional demo address 01, Barcelona')).toBeInTheDocument()
  })
})
