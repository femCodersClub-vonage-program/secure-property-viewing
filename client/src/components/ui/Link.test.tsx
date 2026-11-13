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
})
