import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SYSTEM_ERROR_MESSAGE } from './lib/http'
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

const agent = { name: 'Marta', role: 'AGENT' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

// The agency pages need a signed-in agent: the session answers, every other call never does
const signedInFetch = () =>
  vi.fn<typeof fetch>((input) =>
    String(input) === '/api/agency/session' ? Promise.resolve(json(agent)) : new Promise(() => {}),
  )

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
  ])('shows %s inside the agency layout', async (path, heading) => {
    // D1 asks the server for its summary: the answer never comes, so it stays on its loading heading
    vi.stubGlobal('fetch', signedInFetch())
    renderAt(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Agency' })).toBeInTheDocument()
  })

  it('asks the server for the dashboard summary at /agency', async () => {
    const fetchMock = signedInFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency')

    // First the session check shows its own status: wait until it is the dashboard's
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Loading the dashboard…'),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/agency/summary', expect.anything())
  })

  it('shows the agency room outside the agency layout, so the call has the whole screen', async () => {
    const fetchMock = signedInFetch()
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    renderAt('/agency/visits/5/room')

    // Waits until the room itself is on screen, so the check below can really fail
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/agency/visits/5/video-token', expect.anything()),
    )
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

  it('shows the not found page for an agency room without a valid visit id', async () => {
    vi.stubGlobal('fetch', signedInFetch())
    renderAt('/agency/visits/abc/room')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('asks for the agency video token of the visit in the link', async () => {
    const fetchMock = signedInFetch()
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

  it('shows the sign-in page without asking for a session', () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency/sign-in')

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends a signed-out agent to sign in and back to the room she tried to open', async () => {
    let signedIn = false
    // Remembers the sign-in, as the server does with its session cookie
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input) !== '/api/agency/session') return new Promise(() => {})
      if (init?.method === 'POST') {
        signedIn = true
        return json(agent)
      }
      return signedIn
        ? json(agent)
        : json(
            {
              title: 'Unauthorized',
              status: 401,
              detail: 'Sign in.',
              code: 'AUTHENTICATION_REQUIRED',
            },
            401,
          )
    })
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const router = createMemoryRouter(routes, { initialEntries: ['/agency/visits/5/room'] })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/agency/sign-in')

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'marta@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/agency/visits/5/room'))
  })

  it('says it could not check the session when the server fails, and tries again', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency')

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Checking your session…')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends the agent to sign in again when the room says her session has ended', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input) === '/api/agency/session'
        ? json(agent)
        : json(
            {
              title: 'Unauthorized',
              status: 401,
              detail: 'Sign in.',
              code: 'AUTHENTICATION_REQUIRED',
            },
            401,
          ),
    )
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const router = createMemoryRouter(routes, { initialEntries: ['/agency/visits/5/room'] })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/agency/visits/5/room' })
  })

  it.each(['/agency', '/agency/properties', '/agency/calendar'])(
    'sends a signed-out agent from %s to sign in',
    async (path) => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () =>
          json(
            {
              title: 'Unauthorized',
              status: 401,
              detail: 'Sign in.',
              code: 'AUTHENTICATION_REQUIRED',
            },
            401,
          ),
        ),
      )
      const router = createMemoryRouter(routes, { initialEntries: [path] })
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
      expect(router.state.location.state).toEqual({ from: path })
    },
  )

  it('goes to the dashboard home after signing in from the sign-in page itself', async () => {
    vi.stubGlobal('fetch', signedInFetch())
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const router = createMemoryRouter(routes, { initialEntries: ['/agency/sign-in'] })
    render(<RouterProvider router={router} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'marta@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/agency'))
  })

  it('asks the server for the dashboard summary at /agency', async () => {
    const fetchMock = signedInFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/agency')

    // First the session check shows its own status: wait until it is the dashboard's
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Loading the dashboard…'),
    )
    // The summary is asked for in an effect, which runs just after the screen is drawn
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/agency/summary', expect.anything()),
    )
  })
})
