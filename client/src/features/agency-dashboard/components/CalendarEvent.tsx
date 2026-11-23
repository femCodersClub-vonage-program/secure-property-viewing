import { useId } from 'react'
import { Button, Card, Link } from '../../../components/ui'
import { madridTime } from '../../visit-booking'
import type { AgencyVisit, VisitStatus } from '../types'
import { visitTime } from '../visitTime'

const unavailableReason: Record<Exclude<VisitStatus, 'CONFIRMED'>, string> = {
  CANCELED: 'This visit was canceled',
  COMPLETED: 'This visit has ended',
}

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
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-bold tabular-nums">
        <time dateTime={visit.startsAt}>{startsAt}</time>–
        <time dateTime={visit.endsAt}>{endsAt}</time>
      </p>
      <p>{visit.visitorName}</p>
      <p className="text-sm text-text-muted">{visit.propertyTitle}</p>
      {visit.status === 'CONFIRMED' ? (
        <Link
          to={`/agency/visits/${visit.visitId}/room`}
          variant="button"
          className="mt-2 self-stretch"
        >
          Join visit {hiddenContext}
        </Link>
      ) : (
        <>
          <Button disabled aria-describedby={reasonId} className="mt-2 self-stretch">
            Join visit {hiddenContext}
          </Button>
          <p id={reasonId} className="text-sm text-text-muted">
            {unavailableReason[visit.status]}
          </p>
        </>
      )}
    </Card>
  )
}

export default CalendarEvent
