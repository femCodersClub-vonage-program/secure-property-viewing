import { CalendarDays, Check, MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Card } from '../../../components/ui'
import { dayLabel, madridDay, madridTime } from '../calendar'
import type { BookedVisit } from '../types'

type Props = {
  visit: BookedVisit
}

/** The top of the confirmation screen (A6): the visit is booked, with its day, time and full address. */
function VisitConfirmation({ visit }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The visitor arrives from the calendar, so the focus starts at the new page's heading
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <span
          aria-hidden="true"
          className="flex size-18 items-center justify-center rounded-pill bg-surface-input text-success"
        >
          <Check className="size-8" />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl font-bold text-balance text-brand-dark"
        >
          Your video visit is booked
        </h1>
        <p className="font-body text-text-default">
          Thank you, {visit.visitorName}. An agent will show you the property live.
        </p>
      </div>
      <Card variant="dark" className="flex flex-col gap-4">
        <p className="inline-flex items-center gap-2 font-body text-sm font-bold tracking-wider uppercase">
          <span aria-hidden="true" className="size-2 rounded-pill bg-brand-accent" />
          Video visit
        </p>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold text-balance">{visit.property.title}</h2>
          <p className="font-body">{visit.property.area}</p>
        </div>
        <dl className="flex flex-col gap-4 font-body">
          <div>
            <dt className="flex items-center gap-3 text-sm">
              <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
              When
            </dt>
            <dd className="pl-8 text-lg font-bold">{dayLabel(madridDay(visit.startsAt))}</dd>
            <dd className="pl-8 tabular-nums">
              {madridTime(visit.startsAt)} to {madridTime(visit.endsAt)}, Madrid time
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-3 text-sm">
              <MapPin aria-hidden="true" className="size-5 shrink-0" />
              Address
            </dt>
            <dd className="pl-8">{visit.property.address}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}

export default VisitConfirmation
