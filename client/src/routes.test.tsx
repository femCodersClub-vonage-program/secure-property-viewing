import { render, screen } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { level: 1, name: 'Peephole' })).toBeInTheDocument()
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

  it('shows the not found page for an unknown path', () => {
    renderAt('/does-not-exist')

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  })
})
