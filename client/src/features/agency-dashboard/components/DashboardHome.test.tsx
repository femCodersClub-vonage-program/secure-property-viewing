import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
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
  render(
    <MemoryRouter>
      <DashboardHome />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
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
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(problem(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'))
      .mockResolvedValueOnce(json(summaryExample))
    vi.stubGlobal('fetch', fetchMock)
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to continue.')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hello, Marta' }),
    ).toBeInTheDocument()
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
})
