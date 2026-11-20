import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { UpcomingVisit } from '../types'
import NextVisitCard from './NextVisitCard'

const visit: UpcomingVisit = {
  visitId: 31,
  startsAt: '2027-01-12T11:00:00+01:00',
  visitorName: 'Laura Gómez',
  propertyTitle: 'Apartment in Gràcia',
}

function renderCard() {
  render(
    <MemoryRouter>
      <NextVisitCard visit={visit} />
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'Next video visit' })
}

describe('NextVisitCard', () => {
  it('shows who visits, which property and when', () => {
    const card = renderCard()

    expect(card).toHaveTextContent('Laura Gómez')
    expect(card).toHaveTextContent('Apartment in Gràcia · Tuesday 12 January, 11:00')
  })

  it('links to the visit room with a name that says which visit', () => {
    const card = renderCard()

    expect(
      within(card).getByRole('link', {
        name: 'Join visit with Laura Gómez on Tuesday 12 January, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })
})
