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

// specs/agency-dashboard.md, "API": response of GET /api/agency/listing-requests/{id}, verbatim
const specExample: ListingRequestDetails = {
  id: 18,
  status: 'REJECTED',
  ownerName: 'Ana Torres',
  ownerPhone: '+34600000000',
  title: 'Apartment in Gràcia',
  description: '...',
  propertyType: 'APARTMENT',
  operation: 'RENT',
  area: 'Gràcia',
  address: '...',
  priceEuros: 1200,
  bedrooms: 3,
  sizeM2: 85,
  floor: 2,
  createdAt: '2026-11-10T11:00:00+01:00',
  reviewedAt: '2026-11-11T09:30:00+01:00',
  rejectionReason: '...',
}

// The same request before anyone reviews it, with readable texts to look for
const pending: ListingRequestDetails = {
  ...specExample,
  status: 'PENDING',
  description: 'Bright apartment with a balcony over a quiet street.',
  address: 'Carrer de Verdi 12',
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
const region = (name: string) => screen.getByRole('region', { name })
const reasonField = () => screen.getByRole('textbox', { name: 'Reason for rejecting' })

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

    const owner = region('Owner')
    expect(within(owner).getByText('Ana Torres')).toBeInTheDocument()
    expect(within(owner).getByRole('link', { name: '+34600000000' })).toHaveAttribute(
      'href',
      'tel:+34600000000',
    )

    const property = region('Property')
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

    const review = region('Review')
    expect(within(review).getByText('Tuesday 10 November, 11:00')).toBeInTheDocument()
    expect(within(review).getByText('Not reviewed yet')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(button('Approve and publish')).toBeEnabled()
    expect(button('Reject')).toBeEnabled()
    // It opens the tab where the request is
    expect(screen.getByRole('link', { name: 'Back to listing requests' })).toHaveAttribute(
      'href',
      '/agency/listing-requests?status=PENDING',
    )
  })

  it('shows the request of the spec example: floor, both dates and the reason', async () => {
    getMock.mockResolvedValue(specExample)
    renderDetails()
    await title()

    expect(within(region('Property')).getByText('2')).toBeInTheDocument()
    const review = region('Review')
    expect(within(review).getByText('Tuesday 10 November, 11:00')).toBeInTheDocument()
    expect(within(review).getByText('Wednesday 11 November, 09:30')).toBeInTheDocument()
    expect(within(review).getByText('...')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it.each([
    { floor: null, shown: 'Not given' },
    { floor: 0, shown: '0' },
  ])('shows the floor $floor as "$shown"', async ({ floor, shown }) => {
    getMock.mockResolvedValue({ ...pending, floor })
    renderDetails()
    await title()

    expect(within(region('Property')).getByText(shown)).toBeInTheDocument()
  })

  it('shows a home with no separate bedroom as a studio', async () => {
    getMock.mockResolvedValue({ ...pending, propertyType: 'STUDIO', bedrooms: 0 })
    renderDetails()
    await title()

    // Once as the type and once as the bedrooms
    expect(within(region('Property')).getAllByText('Studio')).toHaveLength(2)
  })

  it('shows when a rejected request was reviewed and why, and says why it cannot be reviewed again', async () => {
    getMock.mockResolvedValue(rejected)
    renderDetails()
    await title()

    const review = region('Review')
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
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(button('Approve and publish')).toHaveAccessibleDescription(
      'This request was already approved',
    )
    // Loading the request again brings when the server says it was reviewed
    expect(
      await within(region('Review')).findByText('Wednesday 11 November, 09:30'),
    ).toBeInTheDocument()
  })

  it('keeps the new status, its review time and its message when loading the request again fails', async () => {
    getMock.mockResolvedValueOnce(pending).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    approveMock.mockResolvedValue({ propertyId: 101 })
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('alert')).toHaveTextContent('Request approved and published.')
    expect(button('Approve and publish')).toBeDisabled()
    expect(within(region('Review')).queryByText('Not reviewed yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows the reason of a rejection even when loading the request again fails', async () => {
    getMock.mockResolvedValueOnce(pending).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    rejectMock.mockResolvedValue({ id: 18, status: 'REJECTED' })
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: '  Duplicated listing  ' } })
    fireEvent.click(button('Reject request'))

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(await within(region('Review')).findByText('Duplicated listing')).toBeInTheDocument()
  })

  it('disables both buttons while an approval is sent, so it cannot be sent twice', async () => {
    getMock.mockResolvedValue(pending)
    approveMock.mockReturnValue(new Promise(() => {}))
    renderDetails()
    await title()

    fireEvent.click(button('Approve and publish'))

    expect(button('Approve and publish')).toBeDisabled()
    expect(button('Reject')).toBeDisabled()
  })

  it('asks for the reason before rejecting, and rejects with it trimmed', async () => {
    getMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected)
    rejectMock.mockResolvedValue({ id: 18, status: 'REJECTED' })
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))

    const reason = reasonField()
    expect(reason).toHaveFocus()
    expect(reason).toBeRequired()
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
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(button('Reject')).toHaveAccessibleDescription('This request was already rejected')
  })

  it('never sends a reason made only of spaces', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: '   ' } })
    fireEvent.click(button('Reject request'))

    expect(screen.getByText('Write why you are rejecting this request.')).toBeInTheDocument()
    expect(rejectMock).not.toHaveBeenCalled()
  })

  it('sends the longest reason the server accepts', async () => {
    getMock.mockResolvedValue(pending)
    rejectMock.mockReturnValue(new Promise(() => {}))
    renderDetails()
    await title()

    const longest = 'x'.repeat(1000)
    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: longest } })
    fireEvent.click(button('Reject request'))

    expect(rejectMock).toHaveBeenCalledWith(18, longest)
  })

  it('disables both buttons while a rejection is sent, so it cannot be sent twice', async () => {
    getMock.mockResolvedValue(pending)
    rejectMock.mockReturnValue(new Promise(() => {}))
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: 'Duplicated listing' } })
    fireEvent.click(button('Reject request'))

    expect(button('Reject request')).toBeDisabled()
    expect(button('Cancel')).toBeDisabled()
  })

  it('refuses a reason longer than the server accepts, without sending it', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: 'x'.repeat(1001) } })
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
    const reason = reasonField()
    fireEvent.change(reason, { target: { value: 'Duplicated listing' } })
    fireEvent.click(button('Reject request'))

    expect(
      await screen.findByText(
        'Write why you are rejecting this request, in 1,000 characters or fewer.',
      ),
    ).toBeInTheDocument()
    expect(reason).toHaveFocus()
  })

  it('does not blame the reason for a validation error about something else', async () => {
    getMock.mockResolvedValue(pending)
    rejectMock.mockRejectedValue(
      new ApiError({
        kind: 'business',
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'One or more fields are invalid.',
      }),
    )
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: 'Duplicated listing' } })
    fireEvent.click(button('Reject request'))

    expect(await screen.findByRole('alert')).toHaveTextContent('One or more fields are invalid.')
    expect(
      screen.queryByText('Write why you are rejecting this request, in 1,000 characters or fewer.'),
    ).not.toBeInTheDocument()
  })

  it('closes the reason with Cancel, forgets the draft and gives the focus back to Reject', async () => {
    getMock.mockResolvedValue(pending)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: 'A first draft' } })
    fireEvent.click(button('Cancel'))

    expect(screen.queryByRole('textbox', { name: 'Reason for rejecting' })).not.toBeInTheDocument()
    expect(button('Reject')).toHaveFocus()

    fireEvent.click(button('Reject'))
    expect(reasonField()).toHaveValue('')
  })

  it('says the request was already reviewed when approving answers 409, and loads it again', async () => {
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

  it('says the request was already reviewed when rejecting answers 409, and closes the form', async () => {
    getMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(approved)
    rejectMock.mockRejectedValue(alreadyReviewed)
    renderDetails()
    await title()

    fireEvent.click(button('Reject'))
    fireEvent.change(reasonField(), { target: { value: 'Duplicated listing' } })
    fireEvent.click(button('Reject request'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The listing request has already been approved or rejected.',
    )
    await waitFor(() =>
      expect(button('Reject')).toHaveAccessibleDescription('This request was already approved'),
    )
    expect(screen.queryByRole('textbox', { name: 'Reason for rejecting' })).not.toBeInTheDocument()
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

  it('keeps the focus on the heading when trying again finds that the request does not exist', async () => {
    getMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(businessError(404, 'NOT_FOUND', 'The listing request does not exist.'))
    renderDetails()

    await screen.findByRole('alert')
    fireEvent.click(button('Try again'))

    expect(await screen.findByText('The listing request does not exist.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Request details' })).toHaveFocus(),
    )
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
