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
    <div className="flex flex-col gap-1">
      {/* Below xl the button stays on the right and long details wrap in their own column.
          From xl everything is stacked and the button takes the width of the day column */}
      <div className="flex items-center justify-between gap-4 xl:flex-col xl:items-stretch xl:gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 xl:flex-none">
          <p className="text-sm font-bold tabular-nums">
            <time dateTime={visit.startsAt}>{startsAt}</time>–
            <time dateTime={visit.endsAt}>{endsAt}</time>
          </p>
          <p className="font-semibold">{visit.visitorName}</p>
          <p className="text-sm text-text-muted">{visit.propertyTitle}</p>
        </div>
        {visit.status === 'CONFIRMED' ? (
          <Link to={`/agency/visits/${visit.visitId}/room`} variant="button" className="shrink-0">
            Join visit {hiddenContext}
          </Link>
        ) : (
          <Button disabled aria-describedby={reasonId} className="shrink-0">
            Join visit {hiddenContext}
          </Button>
        )}
      </div>
      {/* Under the whole row, so it never takes width from the details */}
      {visit.status !== 'CONFIRMED' && (
        <p id={reasonId} className="text-sm text-text-muted">
          {unavailableReason[visit.status]}
        </p>
      )}
    </div>
  )
}

export default CalendarEvent
