import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import {
  approveListingRequest,
  getListingRequest,
  rejectListingRequest,
} from '../listingRequestDetailsSample'
import type { ListingRequestDetails } from '../types'
import RequestDetails from './RequestDetails'

// Until #57 is in dev the screen reads the sample module, so each test decides its answers
vi.mock('../listingRequestDetailsSample', () => ({
  getListingRequest: vi.fn(),
  approveListingRequest: vi.fn(),
  rejectListingRequest: vi.fn(),
}))
const getMock = vi.mocked(getListingRequest)
const approveMock = vi.mocked(approveListingRequest)
const rejectMock = vi.mocked(rejectListingRequest)

// specs/agency-dashboard.md, "API": GET /api/agency/listing-requests/{id}, before anyone reviews it
const pending: ListingRequestDetails = {
  id: 18,
  status: 'PENDING',
  ownerName: 'Ana Torres',
  ownerPhone: '+34600000000',
  title: 'Apartment in Gràcia',
  description: 'Bright apartment with a balcony over a quiet street.',
  propertyType: 'APARTMENT',
  operation: 'RENT',
  area: 'Gràcia',
  address: 'Carrer de Verdi 12',
  priceEuros: 1200,
  bedrooms: 3,
  sizeM2: 85,
  floor: 2,
  createdAt: '2026-11-10T11:00:00+01:00',
  reviewedAt: null,
  rejectionReason: null,
}

const approved: ListingRequestDetails = {
  ...pending,
  status: 'APPROVED',
  reviewedAt: '2026-11-11T09:30:00+01:00',
}

const rejected: ListingRequestDetails = {
  ...pending,
  status: 'REJECTED',
  reviewedAt: '2026-11-11T09:30:00+01:00',
  rejectionReason: 'The address does not match the building in the photos.',
}

const businessError = (status: number, code: string, message: string) =>
  new ApiError({ kind: 'business', status, code, message })

const alreadyReviewed = businessError(
  409,
  'LISTING_REQUEST_ALREADY_REVIEWED',
  'The listing request has already been approved or rejected.',
)

function SignInSpy() {
  const location = useLocation()
  return <p>Sign-in page, from {JSON.stringify(location.state)}</p>
}

function renderDetails() {
  return render(
    <MemoryRouter initialEntries={['/agency/listing-requests/18']}>
      <Routes>
        <Route path="/agency/listing-requests/:id" element={<RequestDetails id={18} />} />
        <Route path="/agency/sign-in" element={<SignInSpy />} />
      </Routes>
    </MemoryRouter>,
  )
}

const title = () => screen.findByRole('heading', { level: 1, name: 'Apartment in Gràcia' })
const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  getMock.mockReset()
  approveMock.mockReset()
  rejectMock.mockReset()
})

describe('RequestDetails', () => {
  it('says the request is loading, under the name of the screen', () => {
    getMock.mockReturnValue(new Promise(() => {}))
    renderDetails()

    expect(screen.getByRole('heading', { level: 1, name: 'Request details' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading the request…')
    expect(getMock).toHaveBeenCalledWith(18, expect.any(AbortSignal))
  })

  it('shows the owner, the property and when the request was received', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    const owner = screen.getByRole('region', { name: 'Owner' })
    expect(within(owner).getByText('Ana Torres')).toBeInTheDocument()
    expect(within(owner).getByRole('link', { name: '+34600000000' })).toHaveAttribute(
      'href',
      'tel:+34600000000',
    )

    const property = screen.getByRole('region', { name: 'Property' })
    for (const text of [
      'Apartment',
      'Rent',
      '1200 €/month',
      'Gràcia',
      'Carrer de Verdi 12',
      '3 bedrooms',
      '85 m²',
      'Bright apartment with a balcony over a quiet street.',
    ]) {
      expect(within(property).getByText(text)).toBeInTheDocument()
    }

    const review = screen.getByRole('region', { name: 'Review' })
    expect(within(review).getByText('Tuesday 10 November, 11:00')).toBeInTheDocument()
    expect(within(review).getByText('Not reviewed yet')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(button('Approve and publish')).toBeEnabled()
    expect(button('Reject')).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Back to listing requests' })).toHaveAttribute(
      'href',
      '/agency/listing-requests',
    )
  })

  it('shows when a rejected request was reviewed and why, and says why it cannot be reviewed again', async () => {
    getMock.mockResolvedValue(rejected)
    renderDetails()
    await title()

    const review = screen.getByRole('region', { name: 'Review' })
    expect(within(review).getByText('Wednesday 11 November, 09:30')).toBeInTheDocument()
    expect(
      within(review).getByText('The address does not match the building in the photos.'),
    ).toBeInTheDocument()
    for (const name of ['Approve and publish', 'Reject']) {
      expect(button(name)).toBeDisabled()
      expect(button(name)).toHaveAccessibleDescription('This request was already rejected')
    }
  })

  it('approves the request and shows its new status, with the focus on the heading', async () => {
    getMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(approved)
    approveMock.mockResolvedValue({ propertyId: 101 })
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent('Request approved and published.')
    // Green like the Approved badge: the success variant of Alert
    expect(notice).toHaveClass('text-success')
    expect(approveMock).toHaveBeenCalledWith(18)
    expect(screen.getByRole('heading', { level: 1, name: 'Apartment in Gràcia' })).toHaveFocus()
    expect(button('Approve and publish')).toHaveAccessibleDescription(
      'This request was already approved',
    )
    // Loading the request again brings when it was reviewed
    const review = screen.getByRole('region', { name: 'Review' })
    expect(await within(review).findByText('Wednesday 11 November, 09:30')).toBeInTheDocument()
  })

  it('asks for the reason before rejecting, and rejects with it trimmed', async () => {
    getMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected)
    rejectMock.mockResolvedValue({ id: 18, status: 'REJECTED' })
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))

    const reason = screen.getByRole('textbox', { name: 'Reason for rejecting' })
    expect(reason).toHaveFocus()
    expect(rejectMock).not.toHaveBeenCalled()

    fireEvent.click(button('Reject request'))

    expect(screen.getByText('Write why you are rejecting this request.')).toBeInTheDocument()
    expect(reason).toHaveFocus()
    expect(rejectMock).not.toHaveBeenCalled()

    fireEvent.change(reason, { target: { value: '  Duplicated listing  ' } })
    fireEvent.click(button('Reject request'))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent('Request rejected.')
    // Neutral like the Rejected badge, never the error red: the info variant of Alert
    expect(notice).toHaveClass('text-text-default')
    expect(notice).not.toHaveClass('text-error')
    expect(rejectMock).toHaveBeenCalledWith(18, 'Duplicated listing')
    expect(button('Reject')).toHaveAccessibleDescription('This request was already rejected')
  })

  it('refuses a reason longer than the server accepts, without sending it', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason for rejecting' }), {
      target: { value: 'x'.repeat(1001) },
    })
    fireEvent.click(button('Reject request'))

    expect(screen.getByText('Write the reason in 1,000 characters or fewer.')).toBeInTheDocument()
    expect(rejectMock).not.toHaveBeenCalled()
  })

  it('points at the reason when the server refuses it', async () => {
    getMock.mockResolvedValue(pending)
    rejectMock.mockRejectedValue(
      new ApiError({
        kind: 'business',
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'One or more fields are invalid.',
        fieldErrors: { reason: 'must explain why the request is rejected' },
      }),
    )
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    const reason = screen.getByRole('textbox', { name: 'Reason for rejecting' })
    fireEvent.change(reason, { target: { value: 'Duplicated listing' } })
    fireEvent.click(button('Reject request'))

    expect(
      await screen.findByText(
        'Write why you are rejecting this request, in 1,000 characters or fewer.',
      ),
    ).toBeInTheDocument()
    expect(reason).toHaveFocus()
  })

  it('closes the reason with Cancel and gives the focus back to Reject', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.click(button('Cancel'))

    expect(screen.queryByRole('textbox', { name: 'Reason for rejecting' })).not.toBeInTheDocument()
    expect(button('Reject')).toHaveFocus()
  })

  it('says the request was already reviewed when the server answers 409, and loads it again', async () => {
    getMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected)
    approveMock.mockRejectedValue(alreadyReviewed)
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The listing request has already been approved or rejected.',
    )
    await waitFor(() => expect(button('Approve and publish')).toBeDisabled())
    expect(button('Approve and publish')).toHaveAccessibleDescription(
      'This request was already rejected',
    )
    expect(getMock).toHaveBeenCalledTimes(2)
  })

  it('shows the general error when a review fails, and leaves the buttons ready to try again', async () => {
    getMock.mockResolvedValue(pending)
    approveMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    await waitFor(() => expect(button('Approve and publish')).toBeEnabled())
  })

  it('says the request does not exist when the server answers 404, with a way back', async () => {
    getMock.mockRejectedValue(
      businessError(404, 'NOT_FOUND', 'The listing request does not exist.'),
    )
    renderDetails()

    expect(await screen.findByText('The listing request does not exist.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Request details' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to listing requests' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows the error and loads again on request, with the focus on the heading', async () => {
    getMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(pending)
    renderDetails()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)

    fireEvent.click(button('Try again'))

    expect(screen.getByRole('heading', { level: 1, name: 'Request details' })).toHaveFocus()
    const heading = await title()
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('sends the agent to sign in again when her session has ended, to come back here', async () => {
    getMock.mockRejectedValue(businessError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.'))
    renderDetails()

    expect(
      await screen.findByText('Sign-in page, from {"from":"/agency/listing-requests/18"}'),
    ).toBeInTheDocument()
  })

  it('sends the agent to sign in again when her session ends while she reviews', async () => {
    getMock.mockResolvedValue(pending)
    approveMock.mockRejectedValue(businessError(401, 'AUTHENTICATION_REQUIRED', 'Sign in.'))
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    expect(
      await screen.findByText('Sign-in page, from {"from":"/agency/listing-requests/18"}'),
    ).toBeInTheDocument()
  })
})
