import { Building2, CalendarDays, ClipboardList } from 'lucide-react'
import type { Ref } from 'react'
import { Card, Link } from '../../../components/ui'
import type { AgencySummary, UpcomingVisit } from '../types'
import { visitTime } from '../visitTime'
import DashboardHeading from './DashboardHeading'
import DataTable, { type Column } from './DataTable'
import NextLabel from './NextLabel'
import NextVisitCard from './NextVisitCard'
import StatCard from './StatCard'

type Props = {
  summary: AgencySummary
  /** So DashboardHome can move the focus to the greeting after "Try again" */
  headingRef?: Ref<HTMLHeadingElement>
}

function buildColumns(nextVisitId: number): Column<UpcomingVisit>[] {
  return [
    { header: 'Visitor', cell: (visit) => visit.visitorName },
    { header: 'Property', cell: (visit) => visit.propertyTitle },
    {
      header: 'Time',
      align: 'end',
      cell: (visit) => (
        <span className="inline-flex items-center gap-2">
          <time dateTime={visit.startsAt}>{visitTime(visit)}</time>
          {visit.visitId === nextVisitId && <NextLabel />}
        </span>
      ),
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
}

// The spec does not promise nextVisits in order, so the earliest one is found here
function byStartTime(a: UpcomingVisit, b: UpcomingVisit) {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt)
}

function DashboardOverview({ summary, headingRef }: Props) {
  const nextVisits = [...summary.nextVisits].sort(byStartTime)
  const nextVisit = nextVisits[0]

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeading ref={headingRef}>
        Hello,{' '}
        <span className="box-decoration-clone bg-linear-to-t from-dashboard-highlight from-35% to-transparent to-35% px-1">
          {summary.agentName}
        </span>
      </DashboardHeading>

      {nextVisit && <NextVisitCard visit={nextVisit} />}

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="New requests"
          value={summary.newRequests}
          linkLabel="View requests"
          to="/agency/listing-requests"
        />
        <StatCard
          icon={CalendarDays}
          label="Upcoming visits"
          value={summary.upcomingVisits}
          linkLabel="View calendar"
          to="/agency/calendar"
        />
        <StatCard
          icon={Building2}
          label="Active properties"
          value={summary.activeProperties}
          linkLabel="View properties"
          to="/agency/properties"
        />
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-dashboard-display text-2xl font-bold text-brand-dark">Next visits</h2>
        {nextVisit ? (
          <DataTable
            caption="Next visits"
            columns={buildColumns(nextVisit.visitId)}
            rows={nextVisits}
            getRowKey={(visit) => visit.visitId}
            highlightedRowKey={nextVisit.visitId}
          />
        ) : (
          <p className="text-text-muted">No upcoming visits</p>
        )}
      </Card>
    </div>
  )
}

export default DashboardOverview
