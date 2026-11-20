import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SAMPLE_SUMMARY } from '../sampleData'
import type { AgencySummary } from '../types'
import DashboardOverview from './DashboardOverview'

function renderOverview(summary: AgencySummary = SAMPLE_SUMMARY) {
  render(
    <MemoryRouter>
      <DashboardOverview summary={summary} />
    </MemoryRouter>,
  )
}

describe('DashboardOverview', () => {
  it('greets the agent by name', () => {
    renderOverview()

    expect(screen.getByRole('heading', { level: 1, name: 'Hello, Marta' })).toBeInTheDocument()
  })

  it('shows the three indicators, each with a link to its screen', () => {
    renderOverview()

    for (const [label, value, linkName, href] of [
      ['New requests', '12', 'View requests', '/agency/listing-requests'],
      ['Upcoming visits', '8', 'View calendar', '/agency/calendar'],
      ['Active properties', '5', 'View properties', '/agency/properties'],
    ]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent(new RegExp(`^${value}$`))
      expect(screen.getByRole('link', { name: linkName })).toHaveAttribute('href', href)
    }
  })

  it('features the next visit with its own Join visit link', () => {
    renderOverview()

    const card = screen.getByRole('region', { name: 'Next video visit' })
    expect(card).toHaveTextContent('Laura Gómez')
    expect(
      within(card).getByRole('link', {
        name: 'Join visit with Laura Gómez on Tuesday 12 January, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })

  it('features the earliest visit even when the list comes unordered', () => {
    renderOverview({ ...SAMPLE_SUMMARY, nextVisits: [...SAMPLE_SUMMARY.nextVisits].reverse() })

    expect(screen.getByRole('region', { name: 'Next video visit' })).toHaveTextContent(
      'Laura Gómez',
    )
  })

  it('lists the next visits, each with a Join visit link to its room', () => {
    renderOverview()

    const table = screen.getByRole('table', { name: 'Next visits' })
    // The header row plus one row per visit
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    expect(
      within(table).getByRole('link', {
        name: 'Join visit with Laura Gómez on Tuesday 12 January, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })

  it('labels the next visit in the table, so the highlight does not rely on color', () => {
    renderOverview()

    const table = screen.getByRole('table', { name: 'Next visits' })
    expect(within(table).getAllByText('Next')).toHaveLength(1)
    expect(within(table).getByText('Next').closest('tr')).toHaveTextContent('Laura Gómez')
  })

  it('says there are no upcoming visits instead of an empty table or a featured card', () => {
    renderOverview({ ...SAMPLE_SUMMARY, nextVisits: [] })

    expect(screen.getByText('No upcoming visits')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Next video visit' })).not.toBeInTheDocument()
  })

  it('renders the summary example from the spec', () => {
    renderOverview({
      agentName: 'Marta',
      newRequests: 12,
      upcomingVisits: 8,
      activeProperties: 5,
      nextVisits: [
        {
          visitId: 31,
          startsAt: '2026-11-10T11:00:00+01:00',
          visitorName: '...',
          propertyTitle: 'Apartment in Gràcia',
        },
      ],
    })

    const table = screen.getByRole('table', { name: 'Next visits' })
    expect(
      within(table).getByRole('link', {
        name: 'Join visit with ... on Tuesday 10 November, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })
})
