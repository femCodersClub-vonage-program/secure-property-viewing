import { dayLabel, madridDay, madridTime } from '../visit-booking'
import type { UpcomingVisit } from './types'

export function visitTime({ startsAt }: Pick<UpcomingVisit, 'startsAt'>) {
  return `${dayLabel(madridDay(startsAt))}, ${madridTime(startsAt)}`
}
