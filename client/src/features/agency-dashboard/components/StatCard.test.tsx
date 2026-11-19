import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('shows the label, the value and a link to its screen', () => {
    render(
      <MemoryRouter>
        <StatCard label="New requests" value={12} linkLabel="View requests" to="/agency/requests" />
      </MemoryRouter>,
    )

    expect(screen.getByText('New requests')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View requests' })).toHaveAttribute(
      'href',
      '/agency/requests',
    )
  })
})
