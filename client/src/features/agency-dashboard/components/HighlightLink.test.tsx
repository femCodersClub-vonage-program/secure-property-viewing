import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import HighlightLink from './HighlightLink'

describe('HighlightLink', () => {
  it('renders a link with its text and destination', () => {
    render(
      <MemoryRouter>
        <HighlightLink to="/agency/visits/31/room">Join visit</HighlightLink>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Join visit' })).toHaveAttribute(
      'href',
      '/agency/visits/31/room',
    )
  })
})
