import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import AgencyLayout from './AgencyLayout'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/agency/sign-in', element: <h1>Sign-in page</h1> },
      {
        path: '/agency',
        element: <AgencyLayout />,
        children: [
          { index: true, element: <h1>Dashboard page</h1> },
          { path: 'calendar', element: <h1>Calendar page</h1> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AgencyLayout', () => {
  it('shows the side navigation next to the current page', () => {
    renderAt('/agency')

    expect(screen.getByRole('navigation', { name: 'Agency' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens and closes the mobile menu from its button', () => {
    renderAt('/agency')
    const menuButton = screen.getByRole('button', { name: 'Menu' })

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the menu and marks the new page after following a link', async () => {
    renderAt('/agency')
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    fireEvent.click(screen.getByRole('link', { name: 'Calendar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Calendar page' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('ends the session and goes to the sign-in page after signing out', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    renderAt('/agency')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-in page' }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agency/session',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('goes to the sign-in page when the session had already ended', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              title: 'Unauthorized',
              status: 401,
              detail: 'Sign in.',
              code: 'AUTHENTICATION_REQUIRED',
            }),
            { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
          ),
      ),
    )
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    renderAt('/agency')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-in page' }),
    ).toBeInTheDocument()
  })

  it('stays on the page and says so when signing out fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })),
    )
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    renderAt('/agency')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard page' })).toBeInTheDocument()
  })
})
