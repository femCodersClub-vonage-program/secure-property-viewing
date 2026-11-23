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
    // The details first and "Join visit" under them, always on the left, so every visit keeps its button
    // in the same place. From xl the button takes the width of the day column
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold tabular-nums">
          <time dateTime={visit.startsAt}>{startsAt}</time>–
          <time dateTime={visit.endsAt}>{endsAt}</time>
        </p>
        <p className="font-semibold">{visit.visitorName}</p>
        <p className="text-sm text-text-muted">{visit.propertyTitle}</p>
      </div>
      {visit.status === 'CONFIRMED' ? (
        <Link
          to={`/agency/visits/${visit.visitId}/room`}
          variant="button"
          className="self-start xl:self-stretch"
        >
          Join visit {hiddenContext}
        </Link>
      ) : (
        // The reason sits next to the button, and moves under it as a whole when it does not fit
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 xl:flex-col xl:items-stretch">
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
