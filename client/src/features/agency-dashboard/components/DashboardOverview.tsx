import { Card, Link } from '../../../components/ui'
import { dayLabel, madridDay, madridTime } from '../../visit-booking'
import type { AgencySummary, UpcomingVisit } from '../types'
import DataTable, { type Column } from './DataTable'
import StatCard from './StatCard'

function visitTime(visit: UpcomingVisit) {
  return `${dayLabel(madridDay(visit.startsAt))}, ${madridTime(visit.startsAt)}`
}

const columns: Column<UpcomingVisit>[] = [
  { header: 'Visitor', cell: (visit) => visit.visitorName },
  { header: 'Property', cell: (visit) => visit.propertyTitle },
  {
    header: 'Time',
    align: 'end',
    cell: (visit) => <time dateTime={visit.startsAt}>{visitTime(visit)}</time>,
  },
  {
    header: 'Video visit',
    align: 'end',
    cell: (visit) => (
      <Link to={`/agency/visits/${visit.visitId}/room`} variant="button">
        Join visit{' '}
        <span className="sr-only">
          with {visit.visitorName} on {visitTime(visit)}
        </span>
      </Link>
    ),
  },
]

function DashboardOverview({ summary }: { summary: AgencySummary }) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-bold text-brand-dark">
        Hello, {summary.agentName}
      </h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="New requests"
          value={summary.newRequests}
          linkLabel="View requests"
          to="/agency/listing-requests"
        />
        <StatCard
          label="Upcoming visits"
          value={summary.upcomingVisits}
          linkLabel="View calendar"
          to="/agency/calendar"
        />
        <StatCard
          label="Active properties"
          value={summary.activeProperties}
          linkLabel="View properties"
          to="/agency/properties"
        />
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-body text-lg font-bold text-brand-dark">Next visits</h2>
        {summary.nextVisits.length === 0 ? (
          <p className="text-text-muted">No upcoming visits</p>
        ) : (
          <DataTable
            caption="Next visits"
            columns={columns}
            rows={summary.nextVisits}
            getRowKey={(visit) => visit.visitId}
          />
        )}
      </Card>
    </div>
  )
}

export default DashboardOverview
