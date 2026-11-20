import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import AgencyLayout from './AgencyLayout'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <h1>Home page</h1> },
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

  it('goes back to the home page after signing out', async () => {
    renderAt('/agency')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Home page' })).toBeInTheDocument()
  })
})
