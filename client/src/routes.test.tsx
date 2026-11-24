import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from './routes'

afterEach(() => {
  vi.unstubAllGlobals()
})

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('routes', () => {
  it('shows the home page at the root path', () => {
    renderAt('/')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Find your next home in Catalonia, without scams.',
      }),
    ).toBeInTheDocument()
  })

  it('shows the visit calendar of the property in the link', () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/properties/7/visit')

    expect(screen.getByRole('status')).toHaveTextContent('Loading the free times…')
    expect(fetchMock).toHaveBeenCalledWith('/api/properties/7/slots', expect.anything())
  })

  it('shows the not found page for a visit link without a valid property id', () => {
    renderAt('/properties/abc/visit')

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the confirmation of the visit the calendar left in the history', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const visit = {
      visitId: 18,
      startsAt: '2026-11-23T11:00:00+01:00',
      endsAt: '2026-11-23T11:30:00+01:00',
      visitorName: 'Laura Gómez',
      property: { title: 'Bright apartment in Gràcia', area: 'Gràcia', address: 'Address 01' },
    }
    const router = createMemoryRouter(routes, {
      initialEntries: [{ pathname: '/visits/18/confirmation', state: { visit } }],
    })
    render(<RouterProvider router={router} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your video visit is booked' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/The room opens at 10:50, 10 minutes before your visit/),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/visits/18/room-links', expect.anything()),
    )
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    // The next reload must not replace the visitor link, so the history remembers it was created
    await waitFor(() =>
      expect(router.state.location.state).toEqual({ visit, roomLinksCreated: true }),
    )
  })

  it('after a reload, never replaces the visitor link without asking', () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const visit = {
      visitId: 18,
      startsAt: '2026-11-23T11:00:00+01:00',
      endsAt: '2026-11-23T11:30:00+01:00',
      visitorName: 'Laura Gómez',
      property: { title: 'Bright apartment in Gràcia', area: 'Gràcia', address: 'Address 01' },
    }
    const router = createMemoryRouter(routes, {
      initialEntries: [
        { pathname: '/visits/18/confirmation', state: { visit, roomLinksCreated: true } },
      ],
    })
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('button', { name: 'Get a new link' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says the confirmation is no longer available when the history has no visit', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>())
    renderAt('/visits/18/confirmation')

    expect(
      screen.getByRole('heading', { level: 1, name: 'This confirmation is no longer available' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See other properties' })).toHaveAttribute('href', '/')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows the not found page for an unknown path', () => {
    renderAt('/does-not-exist')

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  })

  it.each([
    ['/agency', 'Dashboard'],
    ['/agency/properties', 'Properties'],
    ['/agency/listing-requests', 'Listing requests'],
    ['/agency/listing-requests/18', 'Request details'],
    ['/agency/calendar', 'Calendar'],
    ['/agency/messages', 'Messages'],
    ['/agency/profile', 'Profile'],
  ])('shows %s inside the agency layout', (path, heading) => {
    // D1 and D4 ask the server for their data: the answer never comes, so they stay on their loading heading
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise(() => {})),
    )
    renderAt(path)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Agency' })).toBeInTheDocument()
  })

  it('asks the server for the dashboard summary at /agency', () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency')

    expect(screen.getByRole('status')).toHaveTextContent('Loading the dashboard…')
    expect(fetchMock).toHaveBeenCalledWith('/api/agency/summary', expect.anything())
  })

  it('asks the server for the visits of a week at /agency/calendar', () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency/calendar')

    expect(screen.getByRole('status')).toHaveTextContent(/^Loading the visits of /)
    // The week depends on today, so only the shape of the query is checked here
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/agency\/visits\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/),
      expect.anything(),
    )
  })

  it('shows the agency room outside the agency layout, so the call has the whole screen', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise(() => {})),
    )
    renderAt('/agency/visits/5/room')

    expect(screen.queryByRole('navigation', { name: 'Agency' })).not.toBeInTheDocument()
  })

  it('reads the room token from the link and removes it from the address', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const router = createMemoryRouter(routes, { initialEntries: ['/visits/room#room-token-1'] })
    render(<RouterProvider router={router} />)

    // The bug found by hand: the token stayed in the address bar
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/room-links/video-token',
        expect.objectContaining({ body: JSON.stringify({ token: 'room-token-1' }) }),
      ),
    )
  })

  it('says the room link does not work when it has no token', () => {
    renderAt('/visits/room')

    expect(
      screen.getByRole('heading', { level: 1, name: "This room link doesn't work" }),
    ).toBeInTheDocument()
  })

  it('shows the not found page for an agency room without a valid visit id', () => {
    renderAt('/agency/visits/abc/room')

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('asks for the agency video token of the visit in the link', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    renderAt('/agency/visits/5/room')

    // Protects the conversion of the id in the URL to a number
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/agency/visits/5/video-token',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})
