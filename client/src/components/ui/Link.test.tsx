import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Link from './Link'

describe('Link', () => {
  it('renders an internal link with the given text', () => {
    render(
      <MemoryRouter>
        <Link to="/about">About</Link>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
  })

  it('renders an external link with the given text', () => {
    render(<Link href="https://example.com">Visit site</Link>)
    expect(screen.getByRole('link', { name: 'Visit site' })).toBeInTheDocument()
  })

  it('renders an external link with the correct href', () => {
    render(<Link href="https://example.com">Visit site</Link>)
    expect(screen.getByRole('link', { name: 'Visit site' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
  })

  it.each(['button-on-dark', 'outline-on-dark'] as const)(
    'shows a white focus outline in the %s variant, visible on a dark surface',
    (variant) => {
      render(
        <MemoryRouter>
          <Link to="/properties" variant={variant}>
            Browse properties
          </Link>
        </MemoryRouter>,
      )
      const link = screen.getByRole('link', { name: 'Browse properties' })
      expect(link).toHaveClass('focus-visible:outline-text-light')
      expect(link).not.toHaveClass('focus-visible:outline-brand-primary')
    },
  )

  it('renders a button-variant internal link', () => {
    render(
      <MemoryRouter>
        <Link to="/properties/1/visit" variant="button">
          Request a video visit
        </Link>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Request a video visit' })).toBeInTheDocument()
  })
})
