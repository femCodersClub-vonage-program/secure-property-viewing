import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getListingRequests } from '../listingRequestsSample'
import type { ListingRequestSummary } from '../types'
import ListingRequests from './ListingRequests'

// Until #57 is in dev the screen reads the sample module, so each test decides its answers
vi.mock('../listingRequestsSample', () => ({ getListingRequests: vi.fn() }))
const getListingRequestsMock = vi.mocked(getListingRequests)

// specs/agency-dashboard.md, "API": one item of GET /api/agency/listing-requests
const pending: ListingRequestSummary = {
  id: 18,
  ownerName: 'Ana Torres',
  title: 'Apartment in Gràcia',
  operation: 'RENT',
  priceEuros: 1200,
  createdAt: '2026-11-10T11:00:00+01:00',
  status: 'PENDING',
}

const approved: ListingRequestSummary = {
  id: 19,
  ownerName: 'Marc Vidal',
  title: 'House in Sarrià',
  operation: 'SALE',
  priceEuros: 650000,
  createdAt: '2026-11-05T09:15:00+01:00',
  status: 'APPROVED',
}

// Shows where the screen left the address, and where a redirect landed with what it remembered
function LocationSpy() {
  const location = useLocation()
  return <p>Address: {`${location.pathname}${location.search}`}</p>
}

function SignInSpy() {
  const location = useLocation()
  return <p>Sign-in page, from {JSON.stringify(location.state)}</p>
}

function renderAt(path = '/agency/listing-requests') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/agency/listing-requests"
          element={
            <>
              <ListingRequests />
              <LocationSpy />
            </>
          }
        />
        <Route path="/agency/sign-in" element={<SignInSpy />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getListingRequestsMock.mockReset()
})

describe('ListingRequests', () => {
  it('opens on the pending requests and says they are loading', () => {
    getListingRequestsMock.mockReturnValue(new Promise(() => {}))
    renderAt()

    expect(screen.getByRole('heading', { level: 1, name: 'Listing requests' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Loading pending requests…')
    expect(getListingRequestsMock).toHaveBeenCalledWith('PENDING', expect.any(AbortSignal))
  })

  it('lists each request with its owner, property summary, date and status, linked to its details', async () => {
    getListingRequestsMock.mockResolvedValue([pending])
    renderAt()

    const table = await screen.findByRole('table', { name: 'Pending requests' })
    expect(within(table).getByText('Ana Torres')).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: 'Apartment in Gràcia' })).toHaveAttribute(
      'href',
      '/agency/listing-requests/18',
    )
    expect(within(table).getByText('Rent · 1200 €/month')).toBeInTheDocument()
    expect(within(table).getByText('Tuesday 10 November, 11:00')).toBeInTheDocument()
    expect(within(table).getByText('Pending')).toBeInTheDocument()
  })

  it('shows another status when its tab is chosen, and keeps it in the address', async () => {
    getListingRequestsMock.mockImplementation(async (status) =>
      status === 'APPROVED' ? [approved] : [pending],
    )
    renderAt()
    await screen.findByRole('table', { name: 'Pending requests' })

    fireEvent.click(screen.getByRole('tab', { name: 'Approved' }))

    const table = await screen.findByRole('table', { name: 'Approved requests' })
    expect(within(table).getByRole('link', { name: 'House in Sarrià' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Approved' })).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByText('Address: /agency/listing-requests?status=APPROVED'),
    ).toBeInTheDocument()
  })

  it('moves between the tabs with the arrow keys', async () => {
    getListingRequestsMock.mockResolvedValue([])
    renderAt()
    await screen.findByText('No pending requests')

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pending' }), { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'Approved' })).toHaveFocus()
    expect(await screen.findByText('No approved requests')).toBeInTheDocument()
  })

  it('says the new tab is loading, without the rows of the tab it left', async () => {
    // The Approved answer waits until the test sends it, so the moment in between can be checked
    let answerApproved: (requests: ListingRequestSummary[]) => void = () => {}
    getListingRequestsMock.mockImplementation((status) =>
      status === 'APPROVED'
        ? new Promise((resolve) => {
            answerApproved = resolve
          })
        : Promise.resolve([pending]),
    )
    renderAt()
    await screen.findByRole('table', { name: 'Pending requests' })

    fireEvent.click(screen.getByRole('tab', { name: 'Approved' }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading approved requests…')
    expect(screen.queryByRole('link', { name: 'Apartment in Gràcia' })).not.toBeInTheDocument()

    await act(async () => {
      answerApproved([approved])
    })

    expect(screen.getByRole('table', { name: 'Approved requests' })).toBeInTheDocument()
  })

  it('ignores a late answer for the tab the agent left', async () => {
    // The Pending answer arrives after the agent has already moved to Approved
    let answerPending: (requests: ListingRequestSummary[]) => void = () => {}
    getListingRequestsMock.mockImplementation((status) =>
      status === 'PENDING'
        ? new Promise((resolve) => {
            answerPending = resolve
          })
        : Promise.resolve([approved]),
    )
    renderAt()

    fireEvent.click(screen.getByRole('tab', { name: 'Approved' }))
    await screen.findByRole('table', { name: 'Approved requests' })

    await act(async () => {
      answerPending([pending])
    })

    expect(screen.getByRole('table', { name: 'Approved requests' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Apartment in Gràcia' })).not.toBeInTheDocument()
  })

  it("opens on the tab in the address, as after the browser's Back from the details", async () => {
    getListingRequestsMock.mockResolvedValue([])
    renderAt('/agency/listing-requests?status=REJECTED')

    expect(screen.getByRole('tab', { name: 'Rejected' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('No rejected requests')).toBeInTheDocument()
    expect(getListingRequestsMock).toHaveBeenCalledWith('REJECTED', expect.any(AbortSignal))
  })

  it('opens on the pending requests when the address has an unknown status', () => {
    getListingRequestsMock.mockReturnValue(new Promise(() => {}))
    renderAt('/agency/listing-requests?status=ARCHIVED')

    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true')
    expect(getListingRequestsMock).toHaveBeenCalledWith('PENDING', expect.any(AbortSignal))
  })

  it('says when a status has no requests', async () => {
    getListingRequestsMock.mockResolvedValue([])
    renderAt()

    expect(await screen.findByText('No pending requests')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error and loads again on request, with the focus on the heading', async () => {
    getListingRequestsMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce([pending])
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Listing requests' })).toHaveFocus()
    expect(await screen.findByRole('table', { name: 'Pending requests' })).toBeInTheDocument()
    expect(getListingRequestsMock).toHaveBeenCalledTimes(2)
  })

  it('sends the agent to sign in again when her session has ended, to come back to the same tab', async () => {
    getListingRequestsMock.mockRejectedValue(
      new ApiError({
        kind: 'business',
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Sign in to continue.',
      }),
    )
    renderAt('/agency/listing-requests?status=APPROVED')

    expect(
      await screen.findByText(
        'Sign-in page, from {"from":"/agency/listing-requests?status=APPROVED"}',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
