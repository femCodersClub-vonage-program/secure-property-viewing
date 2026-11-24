import { dayLabel, madridDay, madridTime } from '../visit-booking'
import type { UpcomingVisit } from './types'

/** A day and time in Madrid, such as "Tuesday 12 January, 11:00". */
export function madridDateTime(dateTime: string) {
  return `${dayLabel(madridDay(dateTime))}, ${madridTime(dateTime)}`
}

export function visitTime({ startsAt }: Pick<UpcomingVisit, 'startsAt'>) {
  return madridDateTime(startsAt)
}
