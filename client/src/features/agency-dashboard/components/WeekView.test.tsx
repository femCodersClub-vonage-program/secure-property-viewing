import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AgencyVisit } from '../types'
import WeekView from './WeekView'

const WEEK = [
  '2026-11-23',
  '2026-11-24',
  '2026-11-25',
  '2026-11-26',
  '2026-11-27',
  '2026-11-28',
  '2026-11-29',
]

// Shaped like the example of GET /api/agency/visits in specs/agency-dashboard.md
const lateNightVisit: AgencyVisit = {
  visitId: 30,
  // 00:30 on Tuesday in Madrid is still 23:30 on Monday in UTC
  startsAt: '2026-11-24T00:30:00+01:00',
  endsAt: '2026-11-24T01:00:00+01:00',
  visitorName: 'Laura Gómez',
  propertyTitle: 'Apartment in Gràcia',
  status: 'CONFIRMED',
}

const morningVisit: AgencyVisit = {
  visitId: 31,
  startsAt: '2026-11-26T10:00:00+01:00',
  endsAt: '2026-11-26T10:30:00+01:00',
  visitorName: 'Amina Benali',
  propertyTitle: 'Flat in Sants',
  status: 'CONFIRMED',
}

const eveningVisit: AgencyVisit = {
  visitId: 32,
  startsAt: '2026-11-26T17:30:00+01:00',
  endsAt: '2026-11-26T18:00:00+01:00',
  visitorName: 'Joan Puig',
  propertyTitle: 'Studio in Poblenou',
  status: 'CONFIRMED',
}

function renderWeek(visits: AgencyVisit[]) {
  render(
    <MemoryRouter>
      <WeekView days={WEEK} visits={visits} />
    </MemoryRouter>,
  )
}

// The list item of a day, found through its heading
function dayItem(name: string): HTMLElement {
  const item = screen.getByRole('heading', { level: 3, name }).closest('li')
  if (!item) throw new Error(`No list item for ${name}`)
  return item
}

describe('WeekView', () => {
  it('shows the seven days of the week, from Monday to Sunday', () => {
    renderWeek([])

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual([
      'Monday 23 November',
      'Tuesday 24 November',
      'Wednesday 25 November',
      'Thursday 26 November',
      'Friday 27 November',
      'Saturday 28 November',
      'Sunday 29 November',
    ])
  })

  it('puts each visit under its day in Madrid, not in UTC', () => {
    renderWeek([lateNightVisit])

    expect(within(dayItem('Tuesday 24 November')).getByText('Laura Gómez')).toBeInTheDocument()
    expect(within(dayItem('Monday 23 November')).queryByText('Laura Gómez')).not.toBeInTheDocument()
  })

  it('keeps the visits of a day in the order the server sent them', () => {
    renderWeek([morningVisit, eveningVisit])

    const [first, second] = within(dayItem('Thursday 26 November')).getAllByRole('link')
    expect(first).toHaveAccessibleName(
      'Join visit with Amina Benali on Thursday 26 November, 10:00',
    )
    expect(second).toHaveAccessibleName('Join visit with Joan Puig on Thursday 26 November, 17:30')
  })

  it('says which days have no visits', () => {
    renderWeek([morningVisit])

    expect(within(dayItem('Monday 23 November')).getByText('No visits')).toBeInTheDocument()
    expect(within(dayItem('Thursday 26 November')).queryByText('No visits')).not.toBeInTheDocument()
  })
})
