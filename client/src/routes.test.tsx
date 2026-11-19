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
})
