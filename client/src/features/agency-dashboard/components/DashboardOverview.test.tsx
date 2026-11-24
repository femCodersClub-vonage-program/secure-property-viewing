import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AgencySummary } from '../types'
import DashboardOverview from './DashboardOverview'

// A full summary with five visits, shaped like the spec example. It lives here because D1 now reads the server
const SUMMARY: AgencySummary = {
  agentName: 'Marta',
  newRequests: 12,
  upcomingVisits: 8,
  activeProperties: 5,
  nextVisits: [
    {
      visitId: 31,
      startsAt: '2027-01-12T11:00:00+01:00',
      visitorName: 'Laura Gómez',
      propertyTitle: 'Apartment in Gràcia',
    },
    {
      visitId: 32,
      startsAt: '2027-01-12T17:30:00+01:00',
      visitorName: 'Joan Puig',
      propertyTitle: 'Studio in Poblenou',
    },
    {
      visitId: 34,
      startsAt: '2027-01-13T09:30:00+01:00',
      visitorName: 'Pau Serra',
      propertyTitle: 'House in Sarrià',
    },
    {
      visitId: 35,
      startsAt: '2027-01-14T16:00:00+01:00',
      visitorName: 'Clara Martí',
      propertyTitle: 'Apartment in Gràcia',
    },
    {
      visitId: 36,
      startsAt: '2027-01-15T12:00:00+01:00',
      visitorName: 'Nil Ferrer',
      propertyTitle: 'Studio in Poblenou',
    },
  ],
  alerts: [],
}

// Shaped like the alerts example in specs/post-visit-call.md. The times come in UTC, to check they are shown in
// Madrid time
const ALERTS: AgencySummary['alerts'] = [
  {
    visitId: 21,
    visitorName: 'Raquel Moreno',
    propertyTitle: 'Quiet studio in Horta',
    startsAt: '2026-11-28T10:00:00Z',
    reportedAt: '2026-11-28T10:46:12Z',
  },
  {
    visitId: 22,
    visitorName: 'Iván Prieto',
    propertyTitle: 'Large apartment in Eixample',
    startsAt: '2026-11-29T16:30:00Z',
    reportedAt: '2026-11-29T17:16:40Z',
  },
]

function renderOverview(summary: AgencySummary = SUMMARY) {
  render(
    <MemoryRouter>
      <DashboardOverview summary={summary} />
    </MemoryRouter>,
  )
}

describe('DashboardOverview', () => {
  it('shows no Visits to review card when there are no alerts', () => {
    renderOverview()

    expect(screen.queryByRole('heading', { name: 'Visits to review' })).not.toBeInTheDocument()
  })

  it('lists each alert with the visitor, the property, both times in Madrid and the reason in words', () => {
    renderOverview({ ...SUMMARY, alerts: ALERTS })

    const table = screen.getByRole('table', { name: 'Visits to review' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    // Each time in its own column, so the report time is never read as the visit time
    const [visitor, property, visit, reported, reason] = within(rows[0]).getAllByRole('cell')
    expect(visitor).toHaveTextContent('Raquel Moreno')
    expect(property).toHaveTextContent('Quiet studio in Horta')
    expect(visit).toHaveTextContent('Visit Saturday 28 November, 11:00')
    expect(reported).toHaveTextContent('Reported Saturday 28 November, 11:46')
    expect(reason).toHaveTextContent('Asked for money before signing')
    expect(within(rows[1]).getByText('Iván Prieto')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Asked for money before signing')).toBeInTheDocument()
  })

  it('puts the Visits to review card at the top, before the next visit', () => {
    renderOverview({ ...SUMMARY, alerts: ALERTS })

    const reviewHeading = screen.getByRole('heading', { level: 2, name: 'Visits to review' })
    const nextVisit = screen.getByRole('region', { name: 'Next video visit' })
    expect(reviewHeading.compareDocumentPosition(nextVisit)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByRole('heading', { level: 1 }).compareDocumentPosition(reviewHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

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
    renderOverview({ ...SUMMARY, nextVisits: [...SUMMARY.nextVisits].reverse() })

    expect(screen.getByRole('region', { name: 'Next video visit' })).toHaveTextContent(
      'Laura Gómez',
    )
    // Row 0 is the header row, so the table and the card agree on which visit is next
    const rows = within(screen.getByRole('table', { name: 'Next visits' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Laura Gómez')
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
    renderOverview({ ...SUMMARY, nextVisits: [] })

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
      // specs/post-visit-call.md, "API": the alerts example, verbatim
      alerts: [
        {
          visitId: 31,
          visitorName: 'Laura Gómez',
          propertyTitle: 'Apartment in Gràcia',
          startsAt: '2026-11-10T11:00:00+01:00',
          reportedAt: '2026-11-10T11:47:12+01:00',
        },
      ],
    })

    const alerts = screen.getByRole('table', { name: 'Visits to review' })
    expect(alerts).toHaveTextContent('Tuesday 10 November, 11:00')
    expect(alerts).toHaveTextContent('Tuesday 10 November, 11:47')

    const table = screen.getByRole('table', { name: 'Next visits' })
    expect(
      within(table).getByRole('link', {
        name: 'Join visit with ... on Tuesday 10 November, 11:00',
      }),
    ).toHaveAttribute('href', '/agency/visits/31/room')
  })
})
