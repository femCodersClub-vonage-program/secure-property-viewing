import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import DashboardHome from './DashboardHome'

// specs/agency-dashboard.md, "API": response of GET /api/agency/summary, verbatim
const summaryExample = {
  agentName: 'Marta',
  newRequests: 12,
  upcomingVisits: 8,
  activeProperties: 5,
  nextVisits: [
    {
      visitId: 31,
      startsAt: '2026-11-10T11:00:00+01:00',
      visitorName: '...',
      propertyTitle: 'Apartment in Gràcia',
    },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// The shape of every error: specs/data-model-and-api-contract.md → "Errors"
const problem = (status: number, code: string, detail: string) =>
  json({ type: 'about:blank', title: 'Error', status, detail, code }, status)

function renderHome() {
  return render(
    <MemoryRouter>
      <DashboardHome />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DashboardHome', () => {
  it('says the dashboard is loading while the summary is on its way', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise(() => {})),
    )
    renderHome()

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading the dashboard…')
  })

  it('shows the summary from the server', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json(summaryExample))
    vi.stubGlobal('fetch', fetchMock)
    renderHome()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hello, Marta' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/agency/summary', expect.anything())
    expect(screen.queryByText('Loading the dashboard…')).not.toBeInTheDocument()
    // The numbers and the visit reach the screen as the server sent them
    expect(screen.getByText('New requests').nextElementSibling).toHaveTextContent(/^12$/)
    expect(screen.getByText('Upcoming visits').nextElementSibling).toHaveTextContent(/^8$/)
    expect(screen.getByRole('table', { name: 'Next visits' })).toHaveTextContent(
      'Apartment in Gràcia',
    )
  })

  it('says there are no upcoming visits when the server sends none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json({ ...summaryExample, nextVisits: [] })),
    )
    renderHome()

    expect(await screen.findByText('No upcoming visits')).toBeInTheDocument()
  })

  it('shows the message of a business error, and loads again on request', async () => {
    // The second answer waits until the test sends it, so the loading state can be checked
    let answerRetry: (response: Response) => void = () => {}
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(problem(404, 'NOT_FOUND', 'The agency was not found'))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          answerRetry = resolve
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent('The agency was not found')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading the dashboard…')
    // The button is gone, so the focus moves to the heading instead of falling to the page
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toHaveFocus()

    answerRetry(json(summaryExample))

    const greeting = await screen.findByRole('heading', { level: 1, name: 'Hello, Marta' })
    await waitFor(() => expect(greeting).toHaveFocus())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the general error when the server fails, never its internal details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => problem(500, 'INTERNAL_ERROR', 'Boom')),
    )
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.queryByText('Boom')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the general error when the answer breaks the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => json({ ...summaryExample, newRequests: '12' })),
    )
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
  })

  it('cancels the call when the agent leaves the page, without reporting an error', async () => {
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
    const { unmount } = renderHome()

    unmount()
    // Gives the rejected call time to reach the component's catch
    await new Promise((wait) => setTimeout(wait, 0))

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('sends the agent to sign in again when her session has ended, to come back here', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => problem(401, 'AUTHENTICATION_REQUIRED', 'Sign in.')),
    )
    // Shows where the redirect landed and what it remembered
    function SignInSpy() {
      const location = useLocation()
      return <p>Sign-in page, from {JSON.stringify(location.state)}</p>
    }
    render(
      <MemoryRouter initialEntries={['/agency']}>
        <Routes>
          <Route path="/agency" element={<DashboardHome />} />
          <Route path="/agency/sign-in" element={<SignInSpy />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sign-in page, from {"from":"/agency"}')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
