import { TriangleAlert } from 'lucide-react'
import { Badge, Card } from '../../../components/ui'
import type { VisitAlert } from '../types'
import { madridDateTime } from '../visitTime'
import DataTable, { type Column } from './DataTable'

const columns: Column<VisitAlert>[] = [
  { header: 'Visitor', cell: (alert) => alert.visitorName },
  { header: 'Property', cell: (alert) => alert.propertyTitle },
  {
    header: 'Visit',
    align: 'end',
    cell: (alert) => <time dateTime={alert.startsAt}>{madridDateTime(alert.startsAt)}</time>,
  },
  {
    header: 'Reported',
    align: 'end',
    cell: (alert) => <time dateTime={alert.reportedAt}>{madridDateTime(alert.reportedAt)}</time>,
  },
  {
    header: 'Reason',
    // The text says what happened, so the warning color is never the only signal
    cell: () => (
      <Badge variant="warning" className="inline-flex items-center gap-1">
        <TriangleAlert aria-hidden="true" className="size-3" />
        Asked for money before signing
      </Badge>
    ),
  },
]

/** The visits where the post-visit call recorded that someone asked the visitor for money. */
function VisitsToReviewCard({ alerts }: { alerts: VisitAlert[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-dashboard-display text-2xl font-bold text-brand-dark">
        Visits to review
      </h2>
      <DataTable
        caption="Visits to review"
        columns={columns}
        rows={alerts}
        getRowKey={(alert) => alert.visitId}
      />
    </Card>
  )
}

export default VisitsToReviewCard
