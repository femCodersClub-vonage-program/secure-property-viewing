import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import VisitsCalendar from './VisitsCalendar'

// Wednesday 25 November 2026 in Madrid: the calendar opens on the week from Monday 23 to Sunday 29
const NOW = new Date('2026-11-25T10:00:00+01:00')
const THIS_WEEK = '/api/agency/visits?from=2026-11-23&to=2026-11-29'

// Shaped like the example of GET /api/agency/visits in specs/agency-dashboard.md, inside this week
const confirmedVisit = {
  visitId: 31,
  startsAt: '2026-11-24T11:00:00+01:00',
  endsAt: '2026-11-24T11:30:00+01:00',
  visitorName: 'Laura Gómez',
  propertyTitle: 'Apartment in Gràcia',
  status: 'CONFIRMED',
}

const canceledVisit = {
  visitId: 33,
  startsAt: '2026-11-26T10:00:00+01:00',
  endsAt: '2026-11-26T10:30:00+01:00',
  visitorName: 'Amina Benali',
  propertyTitle: 'Flat in Sants',
  status: 'CANCELED',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// The shape of every error: specs/data-model-and-api-contract.md → "Errors"
const problem = (status: number, code: string, detail: string) =>
  json({ type: 'about:blank', title: 'Error', status, detail, code }, status)

function renderCalendar() {
  return render(
    <MemoryRouter>
      <VisitsCalendar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Only the clock is fake, so promises and Testing Library's waits keep working
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('VisitsCalendar', () => {
  it('opens on the current week in Madrid and says it is loading', () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderCalendar()

    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: '23 November – 29 November 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading the visits of 23 November – 29 November 2026…',
    )
    expect(fetchMock).toHaveBeenCalledWith(THIS_WEEK, expect.anything())
  })

  it('shows each visit under its day, with its time, visitor, property and join link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json([confirmedVisit, canceledVisit])),
    )
    renderCalendar()

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Tuesday 24 November' }),
    ).toBeInTheDocument()
    expect(screen.getByText('11:00')).toBeInTheDocument()
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
    expect(screen.getByText('Apartment in Gràcia')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Join visit with Laura Gómez on Tuesday 24 November, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })

  it('only lets the agent join confirmed visits, and says why the others cannot be joined', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json([confirmedVisit, canceledVisit])),
    )
    renderCalendar()

    const button = await screen.findByRole('button', {
      name: 'Join visit with Amina Benali on Thursday 26 November, 10:00',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('This visit was canceled')
    expect(
      screen.queryByRole('link', { name: /Join visit with Amina Benali/ }),
    ).not.toBeInTheDocument()
  })

  it('says there are no visits when the week is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json([])),
    )
    renderCalendar()

    expect(await screen.findByText('No visits this week')).toBeInTheDocument()
  })

  it('moves to the next and previous weeks', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json([]))
    vi.stubGlobal('fetch', fetchMock)
    renderCalendar()
    await screen.findByText('No visits this week')

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))

    expect(
      screen.getByRole('heading', { level: 2, name: '30 November – 6 December 2026' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/agency/visits?from=2026-11-30&to=2026-12-06',
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))

    expect(
      screen.getByRole('heading', { level: 2, name: '16 November – 22 November 2026' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/agency/visits?from=2026-11-16&to=2026-11-22',
      expect.anything(),
    )
  })

  it('cancels the call of the week the agent leaves, without reporting an error', async () => {
    const consoleError = vi.spyOn(console, 'error')
    // Like a real fetch: the call fails with an AbortError when its signal is aborted
    const fetchMock = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = renderCalendar()

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    // Gives the rejected call time to reach the component's catch
    await new Promise((wait) => setTimeout(wait, 0))

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    unmount()
    await new Promise((wait) => setTimeout(wait, 0))

    expect(fetchMock.mock.calls[1]?.[1]?.signal?.aborted).toBe(true)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('ignores a late answer from the week the agent left', async () => {
    // Unlike a real fetch, this mock ignores the signal, so the first week's answer can arrive after leaving it
    let answerFirstWeek: (response: Response) => void = () => {}
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          answerFirstWeek = resolve
        }),
      )
      .mockResolvedValueOnce(json([]))
    vi.stubGlobal('fetch', fetchMock)
    renderCalendar()

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(await screen.findByText('No visits this week')).toBeInTheDocument()

    // act waits until React has applied whatever the late answer changes
    await act(async () => {
      answerFirstWeek(json([confirmedVisit]))
      await new Promise((wait) => setTimeout(wait, 0))
    })

    expect(
      screen.getByRole('heading', { level: 2, name: '30 November – 6 December 2026' }),
    ).toBeInTheDocument()
    // Without the guard, the old week's list would replace the empty state and draw the seven days
    expect(screen.getByText('No visits this week')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('shows the message of a business error, and loads again on request', async () => {
    // The second answer waits until the test sends it, so the loading state can be checked
    let answerRetry: (response: Response) => void = () => {}
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(problem(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          answerRetry = resolve
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderCalendar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to continue.')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading the visits of')
    // The button is gone, so the focus moves to the heading instead of falling to the page
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toHaveFocus()

    answerRetry(json([confirmedVisit]))

    expect(await screen.findByText('Laura Gómez')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(THIS_WEEK, expect.anything())
  })

  it('shows the general error when the server fails, and keeps the week controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => problem(500, 'INTERNAL_ERROR', 'Boom')),
    )
    renderCalendar()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.queryByText('Boom')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled()
  })

  it('shows the general error when the answer breaks the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json([{ ...confirmedVisit, status: 'MISSED' }])),
    )
    renderCalendar()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE))
  })
})
