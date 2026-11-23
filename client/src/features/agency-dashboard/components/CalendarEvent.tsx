import { useId } from 'react'
import { Button, Link } from '../../../components/ui'
import { madridTime } from '../../visit-booking'
import type { AgencyVisit, VisitStatus } from '../types'
import { visitTime } from '../visitTime'

const unavailableReason: Record<Exclude<VisitStatus, 'CONFIRMED'>, string> = {
  CANCELED: 'This visit was canceled',
  COMPLETED: 'This visit has ended',
}

// One visit of the calendar. The week's card and its dividing lines come from WeekView
function CalendarEvent({ visit }: { visit: AgencyVisit }) {
  const reasonId = useId()
  const startsAt = madridTime(visit.startsAt)
  const endsAt = madridTime(visit.endsAt)
  // The same accessible name as "Join visit" in D1. It has the day because a week can repeat a time
  const hiddenContext = (
    <span className="sr-only">
      with {visit.visitorName} on {visitTime(visit)}
    </span>
  )

  return (
    // A row below xl, with the details on the left and "Join visit" on the right, and a stack inside a day column from xl
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 xl:flex-col xl:items-stretch">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold tabular-nums">
          <time dateTime={visit.startsAt}>{startsAt}</time>–
          <time dateTime={visit.endsAt}>{endsAt}</time>
        </p>
        <p className="font-semibold">{visit.visitorName}</p>
        <p className="text-sm text-text-muted">{visit.propertyTitle}</p>
      </div>
      {visit.status === 'CONFIRMED' ? (
        <Link to={`/agency/visits/${visit.visitId}/room`} variant="button">
          Join visit {hiddenContext}
        </Link>
      ) : (
        <div className="flex flex-col items-start gap-1 xl:items-stretch">
          <Button disabled aria-describedby={reasonId}>
            Join visit {hiddenContext}
          </Button>
          <p id={reasonId} className="text-sm text-text-muted">
            {unavailableReason[visit.status]}
          </p>
        </div>
      )}
    </div>
  )
}

export default CalendarEvent
