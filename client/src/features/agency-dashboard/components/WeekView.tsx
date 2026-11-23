import { Card } from '../../../components/ui'
import { dayLabel, madridDay } from '../../visit-booking'
import type { AgencyVisit } from '../types'
import CalendarEvent from './CalendarEvent'

type Props = {
  /** The seven days of the week, from Monday to Sunday */
  days: string[]
  visits: AgencyVisit[]
}

// One list of days for both layouts, so the reading order is the same everywhere:
// rows split by lines below xl, and seven columns split by lines from xl
function WeekView({ days, visits }: Props) {
  return (
    <Card>
      <ol className="flex flex-col divide-y divide-border xl:grid xl:grid-cols-7 xl:divide-x xl:divide-y-0">
        {days.map((day) => {
          // The server sends the visits by start time, so each day keeps that order
          const visitsOfDay = visits.filter((visit) => madridDay(visit.startsAt) === day)

          return (
            <li
              key={day}
              className="flex min-w-0 flex-col gap-2 py-4 first:pt-0 last:pb-0 xl:px-2 xl:py-0 xl:first:pl-0 xl:last:pr-0"
            >
              <h3 className="font-dashboard-display font-bold text-brand-dark">{dayLabel(day)}</h3>
              {visitsOfDay.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {visitsOfDay.map((visit) => (
                    <li key={visit.visitId} className="py-3 first:pt-0 last:pb-0">
                      <CalendarEvent visit={visit} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">No visits</p>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default WeekView
