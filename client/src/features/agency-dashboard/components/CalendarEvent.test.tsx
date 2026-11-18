import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AgencyVisit } from '../types'
import CalendarEvent from './CalendarEvent'

const visit: AgencyVisit = {
  visitId: 31,
  startsAt: '2027-01-12T11:00:00+01:00',
  endsAt: '2027-01-12T11:30:00+01:00',
  visitorName: 'Laura Gómez',
  propertyTitle: 'Apartment in Gràcia',
  status: 'CONFIRMED',
}

describe('CalendarEvent', () => {
  it('shows the time in Madrid, the visitor and the property', () => {
    render(
      <MemoryRouter>
        <CalendarEvent visit={visit} />
      </MemoryRouter>,
    )

    expect(screen.getByText('11:00')).toBeInTheDocument()
    expect(screen.getByText('11:30')).toBeInTheDocument()
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
    expect(screen.getByText('Apartment in Gràcia')).toBeInTheDocument()
  })

  it('links to the agent room of the visit', () => {
    render(
      <MemoryRouter>
        <CalendarEvent visit={visit} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Join visit with Laura Gómez at 11:00' }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })
})
