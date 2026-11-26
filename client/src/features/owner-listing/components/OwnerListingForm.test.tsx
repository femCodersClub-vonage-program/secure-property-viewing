import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { routes } from '../../../routes'
import { openCheckUrl } from '../../phone-verification/silentAuth'

// jsdom cannot leave the page, so opening the check URL is recorded instead
vi.mock('../../phone-verification/silentAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../phone-verification/silentAuth')>()),
  openCheckUrl: vi.fn(),
}))

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

async function fillOwnerDetails(phone = '612 987 654') {
  await screen.findByRole('heading', { name: 'Your details' })
  type('Full name', 'Ana Torres')
  type('Phone number', phone)
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
  fireEvent.click(await screen.findByRole('button', { name: 'Send code' }))
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
  vi.mocked(openCheckUrl).mockReset()
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

  it('marks every field as required except the floor', async () => {
    renderAt('/list-property/form')
    await screen.findByRole('heading', { name: 'Your details' })
    for (const name of ['Full name', 'Phone number']) {
      expect(screen.getByRole('textbox', { name })).toBeRequired()
    }

    await fillOwnerDetails()
    await screen.findByRole('heading', { name: 'Property details' })

    const required = ['Title', 'Description', 'Neighborhood', 'Address', 'Price', 'Size (m²)']
    for (const name of [...required, 'Bedrooms']) {
      expect(screen.getByRole('textbox', { name })).toBeRequired()
    }
    expect(screen.getByRole('textbox', { name: 'Floor (optional)' })).not.toBeRequired()
  })

  it('stays on the property step and says how to fix each missing detail', async () => {
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await screen.findByRole('heading', { name: 'Property details' })

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Step 2 of 3: Property')).toBeInTheDocument()
    const messages = {
      Title: 'Enter a title.',
      Description: 'Enter a description.',
      Neighborhood: 'Enter the neighborhood.',
      Address: 'Enter the address.',
      Price: 'Enter a price greater than 0, in whole euros.',
      'Size (m²)': 'Enter the size in whole square meters, greater than 0.',
      Bedrooms: 'Enter a whole number of bedrooms from 0 to 50. A studio has 0.',
    }
    for (const [name, message] of Object.entries(messages)) {
      expect(screen.getByRole('textbox', { name })).toHaveAccessibleDescription(
        expect.stringContaining(message),
      )
    }
    expect(screen.getByRole('group', { name: 'Operation' })).toHaveAccessibleDescription(
      'Choose rent or sale.',
    )
    expect(screen.getByRole('group', { name: 'Property type' })).toHaveAccessibleDescription(
      'Choose the property type.',
    )
  })

  it('moves to the property step and puts the focus on the progress', async () => {
    renderAt('/list-property/form')

    await fillOwnerDetails()

    expect(await screen.findByText('Step 2 of 3: Property')).toHaveFocus()
  })

  it('opens the verification with the phone number from the details step', async () => {
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()

    expect(await screen.findByRole('textbox', { name: 'Phone number' })).toHaveValue('+34612987654')
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

  it('keeps what was entered when the owner goes back from the verification', async () => {
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()
    await screen.findByRole('button', { name: 'Send code' })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Apartment in Gràcia')
    expect(screen.getByRole('button', { name: 'Rent' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('textbox', { name: 'Full name' })).toHaveValue('Ana Torres')
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
    const main = within(screen.getByRole('main'))
    expect(main.queryByRole('button')).not.toBeInTheDocument()
    expect(main.getAllByRole('link')).toEqual([
      main.getByRole('link', { name: 'Back to the home page' }),
    ])
    expect(main.getByRole('link')).toHaveAttribute('href', '/')
  })

  it('lists the next steps in order after sending the request', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () => json({ id: 18, status: 'PENDING' }, 201))
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()
    await screen.findByRole('heading', { name: 'Next steps' })

    const steps = within(screen.getByRole('main')).getAllByRole('listitem')

    expect(steps).toHaveLength(3)
    expect(steps[0]).toHaveTextContent('Information review')
    expect(steps[1]).toHaveTextContent('Agency contact')
    expect(steps[2]).toHaveTextContent('Video call with the agency')
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

  it('goes back to the details step when the server rejects an owner field', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () =>
      json(
        {
          title: 'Invalid request',
          status: 400,
          detail: 'Some fields are not valid.',
          code: 'VALIDATION_FAILED',
          errors: { ownerPhone: 'Enter another phone number.' },
        },
        400,
      ),
    )
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()

    await screen.findByRole('heading', { name: 'Your details' })

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAccessibleDescription(
      expect.stringContaining('Enter another phone number.'),
    )
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Ana Torres')
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
    expect(await screen.findByRole('textbox', { name: 'Phone number' })).toHaveValue('+34612987654')
    expect(screen.getByText('Step 3 of 3: Verification')).toBeInTheDocument()

    serveVerification(43)
    serve('POST /api/listing-requests', () => json({ id: 18, status: 'PENDING' }, 201))
    await verifyPhone()

    await screen.findByRole('heading', { level: 1, name: 'Your request has been sent' })
    expect(bodyOf(callsTo('POST /api/listing-requests')[1])).toEqual({
      ...requestFromSpec,
      phoneVerificationId: 43,
    })
  })

  it('moves the focus to the progress when going back after a submit error', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () => json({}, 500))
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()
    await screen.findByText(SYSTEM_ERROR_MESSAGE)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByText('Step 2 of 3: Property')).toHaveFocus()
    // The property step never shows the notice, so it is checked back on the verification
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('button', { name: 'Send code' })
    expect(screen.queryByText(SYSTEM_ERROR_MESSAGE)).not.toBeInTheDocument()
  })

  it('says what to do when the server rejects the request without naming a field', async () => {
    serveVerification()
    serve('POST /api/listing-requests', () =>
      json(
        {
          title: 'Bad Request',
          status: 400,
          detail: 'The request body is invalid.',
          code: 'VALIDATION_FAILED',
          errors: {},
        },
        400,
      ),
    )
    renderAt('/list-property/form')
    await fillOwnerDetails()
    await fillPropertyDetails()
    await verifyPhone()

    const message = await screen.findByText(/check your property details/)
    expect(message.closest('[tabindex="-1"]')).toHaveFocus()
    expect(screen.getByText('Step 3 of 3: Verification')).toBeInTheDocument()
  })
})

describe('coming back from the silent check', () => {
  function saveSilentCheck() {
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
  }

  it('does not check the used code again when sending the request fails', async () => {
    saveSilentCheck()
    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/listing-requests', () => json({}, 500))

    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    expect(await screen.findByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
    expect(screen.getByText(SYSTEM_ERROR_MESSAGE).closest('[tabindex="-1"]')).toHaveFocus()
    expect(callsTo('POST /api/phone-verifications/42/silent-check')).toHaveLength(1)
  })

  it('sends the saved request with nothing to type again', async () => {
    saveSilentCheck()
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

describe('from the form to the operator and back', () => {
  it('saves the form before leaving, and sends it on the return', async () => {
    serve('POST /api/phone-verifications', () =>
      json(
        {
          id: 42,
          status: 'PENDING',
          resendAvailableAt: '2026-11-26T10:00:32+01:00',
          checkUrl: 'https://api.nexmo.com/v2/verify/c11236f4/silent-auth/redirect',
        },
        201,
      ),
    )
    renderAt('/list-property/form')
    // A +990 number tries the silent check from any browser
    await fillOwnerDetails('+990123400')
    await fillPropertyDetails()
    fireEvent.click(await screen.findByRole('button', { name: 'Send code' }))
    await waitFor(() =>
      expect(openCheckUrl).toHaveBeenCalledWith(
        'https://api.nexmo.com/v2/verify/c11236f4/silent-auth/redirect',
      ),
    )
    const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    expect(saved).toMatchObject({
      verificationId: 42,
      purpose: 'LISTING_REQUEST',
      phone: '+990123400',
      form: { ownerName: 'Ana Torres', title: 'Apartment in Gràcia', floor: '2' },
    })
    // Opening the check URL reloads the page: only what was saved survives
    cleanup()

    serve('POST /api/phone-verifications/42/silent-check', () =>
      json({ id: 42, status: 'VERIFIED' }, 200),
    )
    serve('POST /api/listing-requests', () => json({ id: 18, status: 'PENDING' }, 201))
    renderAt('/verification/return#request_id=c11236f4&code=si9sfG')

    await screen.findByRole('heading', { level: 1, name: 'Your request has been sent' })
    expect(bodyOf(callsTo('POST /api/listing-requests')[0])).toEqual({
      ...requestFromSpec,
      ownerPhone: '+990123400',
    })
  })
})
