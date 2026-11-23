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

function renderEvent(shown: AgencyVisit) {
  render(
    <MemoryRouter>
      <CalendarEvent visit={shown} />
    </MemoryRouter>,
  )
}

describe('CalendarEvent', () => {
  it('shows the time in Madrid, the visitor and the property', () => {
    renderEvent(visit)

    expect(screen.getByText('11:00')).toBeInTheDocument()
    expect(screen.getByText('11:30')).toBeInTheDocument()
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
    expect(screen.getByText('Apartment in Gràcia')).toBeInTheDocument()
  })

  it('links to the agent room of the visit, named with its day and time as in D1', () => {
    renderEvent(visit)

    expect(
      screen.getByRole('link', {
        name: 'Join visit with Laura Gómez on Tuesday 12 January, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })

  it.each([
    ['CANCELED', 'This visit was canceled'],
    ['COMPLETED', 'This visit has ended'],
  ] as const)('shows a disabled button and says why when the visit is %s', (status, reason) => {
    renderEvent({ ...visit, status })

    expect(screen.queryByRole('link', { name: /Join visit/ })).not.toBeInTheDocument()
    const button = screen.getByRole('button', {
      name: 'Join visit with Laura Gómez on Tuesday 12 January, 11:00',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(reason)
  })
})
