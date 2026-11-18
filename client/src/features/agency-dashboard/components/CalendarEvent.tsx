import { Card, Link } from '../../../components/ui'
import { madridTime } from '../../visit-booking'
import type { AgencyVisit } from '../types'

function CalendarEvent({ visit }: { visit: AgencyVisit }) {
  const startsAt = madridTime(visit.startsAt)
  const endsAt = madridTime(visit.endsAt)

  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-bold tabular-nums">
        <time dateTime={visit.startsAt}>{startsAt}</time>–
        <time dateTime={visit.endsAt}>{endsAt}</time>
      </p>
      <p>{visit.visitorName}</p>
      <p className="text-sm text-text-muted">{visit.propertyTitle}</p>
      <Link
        to={`/agency/visits/${visit.visitId}/room`}
        variant="button"
        className="mt-2 self-start"
      >
        Join visit{' '}
        <span className="sr-only">
          with {visit.visitorName} at {startsAt}
        </span>
      </Link>
    </Card>
  )
}

export default CalendarEvent
