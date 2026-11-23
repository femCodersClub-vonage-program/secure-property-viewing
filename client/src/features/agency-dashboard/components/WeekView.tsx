import { Card } from '../../../components/ui'
import { madridDay } from '../../visit-booking'
import type { AgencyVisit } from '../types'
import { dayParts } from '../week'
import CalendarEvent from './CalendarEvent'

type Props = {
  /** The seven days of the week, from Monday to Sunday */
  days: string[]
  visits: AgencyVisit[]
}

// One list of days for both layouts, so the reading order is the same everywhere: below xl each day
// starts with its header band, and from xl the bands make one header row over seven columns split by lines
function WeekView({ days, visits }: Props) {
  return (
    <Card>
      <ol className="flex flex-col gap-4 xl:grid xl:grid-cols-7 xl:gap-0 xl:divide-x xl:divide-border">
        {days.map((day) => {
          const { weekday, dayOfMonth, month } = dayParts(day)
          // The server sends the visits by start time, so each day keeps that order
          const visitsOfDay = visits.filter((visit) => madridDay(visit.startsAt) === day)

          return (
            <li key={day} className="flex min-w-0 flex-col">
              {/* Its accessible name is always the full date, such as "Tuesday 1 December".
                  Below xl the date comes first and the weekday moves to the right only visually, so the numbers
                  line up. From xl the weekday sits above the number, and the month is only hidden from view */}
              <h3 className="flex items-baseline justify-between gap-2 border-b border-border bg-dashboard-page px-2 py-2 font-dashboard-display text-brand-dark xl:flex-col xl:items-start xl:justify-start xl:gap-0">
                <span className="order-last font-dashboard-body text-sm text-text-muted xl:order-none">
                  {weekday}
                </span>{' '}
                <span className="text-2xl leading-tight font-bold tabular-nums">
                  {dayOfMonth}
                  <span className="xl:sr-only">{` ${month}`}</span>
                </span>
              </h3>
              {visitsOfDay.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border px-2">
                  {visitsOfDay.map((visit) => (
                    <li key={visit.visitId} className="py-3">
                      <CalendarEvent visit={visit} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-3 text-sm text-text-muted">No visits</p>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default WeekView
