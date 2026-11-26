import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../../routes'

// Journey B through the real routes, with fetch answering as the server in specs/owner-listing.md

const NOW = new Date('2026-11-26T10:00:00+01:00')

// Copied from specs/owner-listing.md, "API", with a real description
const requestFromSpec = {
  ownerName: 'Ana Torres',
  ownerPhone: '+34612987654',
  title: 'Apartment in Gràcia',
  description: 'Bright apartment with a balcony.',
  propertyType: 'APARTMENT',
  operation: 'RENT',
  area: 'Gràcia',
  address: 'Carrer de Verdi, 123',
  priceEuros: 1200,
  bedrooms: 3,
  sizeM2: 85,
  floor: 2,
  phoneVerificationId: 42,
}

const STORAGE_KEY = 'peephole.silent-check'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

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

function serveVerification(id = 42) {
  serve('POST /api/phone-verifications', () =>
    json({ id, status: 'PENDING', resendAvailableAt: '2026-11-26T10:00:32+01:00' }, 201),
  )
  serve(`POST /api/phone-verifications/${id}/check`, () => json({ id, status: 'VERIFIED' }, 200))
}

function renderAt(entry: string) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  render(<RouterProvider router={router} />)
  return router
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })
}

async function fillOwnerDetails() {
  await screen.findByRole('heading', { name: 'Your details' })
  type('Full name', 'Ana Torres')
  type('Phone number', '612 987 654')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

async function fillPropertyDetails() {
  await screen.findByRole('heading', { name: 'Property details' })
  fireEvent.click(screen.getByRole('button', { name: 'Rent' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apartment' }))
  type('Title', 'Apartment in Gràcia')
  type('Description', 'Bright apartment with a balcony.')
  type('Neighborhood', 'Gràcia')
  type('Address', 'Carrer de Verdi, 123')
  type('Price (€/month)', '1200')
  type('Size (m²)', '85')
  type('Bedrooms', '3')
  type('Floor (optional)', '2')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

async function verifyPhone() {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Phone number' }), {
    target: { value: '+34612987654' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
  fireEvent.change(await screen.findByRole('textbox', { name: 'Code from the SMS' }), {
    target: { value: '482931' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
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
  sessionStorage.clear()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('owner listing form', () => {
  it('shows three steps with Details as the current one', async () => {
    renderAt('/list-property/form')

    expect(await screen.findByText('Step 1 of 3: Details')).toBeInTheDocument()
    const progress = within(screen.getByRole('list', { name: 'Form progress' }))
    expect(progress.getByText('Details').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(progress.getByText('Property').closest('li')).not.toHaveAttribute('aria-current')
  })

  it('links each missing owner detail to a message that says how to fix it', async () => {
    renderAt('/list-property/form')
    await screen.findByRole('heading', { name: 'Your details' })

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveAccessibleDescription(
      expect.stringContaining('Enter your full name.'),
    )
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Step 1 of 3: Details')).toBeInTheDocument()
  })

  it('moves to the property step and puts the focus on the progress', async () => {
    renderAt('/list-property/form')

    await fillOwnerDetails()

    expect(await screen.findByText('Step 2 of 3: Property')).toHaveFocus()
  })

  it('shows €/month for rent and € for sale', async () => {
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await screen.findByRole('heading', { name: 'Property details' })

    fireEvent.click(screen.getByRole('button', { name: 'Rent' }))
    expect(screen.getByRole('textbox', { name: 'Price (€/month)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rent' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Sale' }))
    expect(screen.getByRole('textbox', { name: 'Price (€)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rent' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps what was entered when the owner goes back and forward', async () => {
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await screen.findByRole('heading', { name: 'Property details' })
    type('Title', 'Apartment in Gràcia')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('textbox', { name: 'Full name' })).toHaveValue('Ana Torres')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Apartment in Gràcia')
  })

  it('sends the request of the spec once the phone is verified, then confirms it', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () => json({ id: 18, status: 'PENDING' }, 201))
    const router = renderAt('/list-property/form')

    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Your request has been sent',
    })
    expect(heading).toHaveFocus()
    expect(bodyOf(callsTo('POST /api/listing-requests')[0])).toEqual(requestFromSpec)
    expect(bodyOf(callsTo('POST /api/phone-verifications')[0])).toMatchObject({
      purpose: 'LISTING_REQUEST',
    })
    expect(router.state.location.pathname).toBe('/list-property/submitted')
    // No account, so no request details: only the way back home
    expect(screen.queryByRole('link', { name: /request details/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveAttribute('href', '/')
  })

  it('shows a field the server rejects next to it, keeping the rest of the data', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () =>
      json(
        {
          title: 'Invalid request',
          status: 400,
          detail: 'Some fields are not valid.',
          code: 'VALIDATION_FAILED',
          errors: { priceEuros: 'Enter a price greater than 0.' },
        },
        400,
      ),
    )
    renderAt('/list-property/form')

    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()

    const price = await screen.findByRole('textbox', { name: 'Price (€/month)' })
    expect(price).toHaveAccessibleDescription(
      expect.stringContaining('Enter a price greater than 0.'),
    )
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Apartment in Gràcia')
    expect(screen.getByText('Step 2 of 3: Property')).toHaveFocus()
  })

  it('asks for a new verification when the server rejects the one used', async () => {
    serveVerification(42)
    serve('POST /api/listing-requests', () =>
      json(
        {
          title: 'Invalid verification',
          status: 422,
          detail: 'Verify your phone number again.',
          code: 'PHONE_VERIFICATION_INVALID',
        },
        422,
      ),
    )
    renderAt('/list-property/form')

    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()

    await waitFor(() =>
      expect(screen.getByText('Verify your phone number again.')).toBeInTheDocument(),
    )
    expect(await screen.findByRole('textbox', { name: 'Phone number' })).toHaveValue('')
    expect(screen.getByText('Step 3 of 3: Verification')).toBeInTheDocument()
  })
})

describe('coming back from the silent check', () => {
  it('sends the saved request with nothing to type again', async () => {
    const { phoneVerificationId: _id, ...withoutId } = requestFromSpec
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        verificationId: 42,
        purpose: 'LISTING_REQUEST',
        phone: '+34612987654',
        resendAvailableAt: '2026-11-26T10:00:32+01:00',
        // Saved as the form keeps it: every value as text
        form: {
          ...withoutId,
          ownerPhone: '612 987 654',
          priceEuros: '1200',
          bedrooms: '3',
          sizeM2: '85',
          floor: '2',
        },
      }),
    )
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/listing-requests', () => json({ id: 18, status: 'PENDING' }, 201))

    const router = renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your request has been sent' }),
    ).toBeInTheDocument()
    expect(bodyOf(callsTo('POST /api/listing-requests')[0])).toEqual(requestFromSpec)
    expect(router.state.location.pathname).toBe('/list-property/submitted')
  })
})
