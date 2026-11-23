import { dayLabel, madridDay } from '../../visit-booking'
import type { AgencyVisit } from '../types'
import CalendarEvent from './CalendarEvent'

type Props = {
  /** The seven days of the week, from Monday to Sunday */
  days: string[]
  visits: AgencyVisit[]
}

// One list for both layouts, so the reading order is the same everywhere: seven columns from xl,
// and below xl a list that only shows the days with visits
function WeekView({ days, visits }: Props) {
  return (
    <ol className="flex flex-col gap-6 xl:grid xl:grid-cols-7 xl:gap-3">
      {days.map((day) => {
        // The server sends the visits by start time, so each day keeps that order
        const visitsOfDay = visits.filter((visit) => madridDay(visit.startsAt) === day)
        const hasVisits = visitsOfDay.length > 0

        return (
          <li
            key={day}
            className={`${hasVisits ? 'flex' : 'hidden xl:flex'} min-w-0 flex-col gap-3`}
          >
            <h3 className="font-dashboard-display text-lg font-bold text-brand-dark">
              {dayLabel(day)}
            </h3>
            {hasVisits ? (
              <ul className="flex flex-col gap-3">
                {visitsOfDay.map((visit) => (
                  <li key={visit.visitId}>
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
  )
}

export default WeekView
