import { addDays, madridDay } from '../visit-booking'

// Weeks start on Monday, as calendars do in Spain. Days are 'YYYY-MM-DD' keys in Madrid time,
// the same format as the from and to of GET /api/agency/visits

const DAYS_IN_WEEK = 7

// A day key read at noon UTC stays on the same calendar day in every time zone
function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`)
}

/** The Monday of the week of a day, such as '2026-11-23' for '2026-11-25'. */
export function weekStart(day: string): string {
  // getUTCDay counts from Sunday (0), so this turns Monday into 0 and Sunday into 6
  const daysSinceMonday = (dayToDate(day).getUTCDay() + 6) % 7
  return addDays(day, -daysSinceMonday)
}

/** The Monday of the week that is going on now in Madrid, wherever the browser is. */
export function currentWeekStart(now: Date = new Date()): string {
  return weekStart(madridDay(now))
}

/** The Monday a number of weeks before (negative) or after (positive) the given one. */
export function addWeeks(monday: string, weeks: number): string {
  return addDays(monday, weeks * DAYS_IN_WEEK)
}

/** The Sunday of the week, the `to` of GET /api/agency/visits. */
export function weekEnd(monday: string): string {
  return addDays(monday, DAYS_IN_WEEK - 1)
}

/** The seven days of the week, from Monday to Sunday. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(monday, index))
}

const dayAndMonth = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
})

const fullDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Such as '23 November – 29 November 2026'. A week that crosses into a new year shows both years. */
export function weekLabel(monday: string): string {
  const sunday = weekEnd(monday)
  const startFormat = monday.slice(0, 4) === sunday.slice(0, 4) ? dayAndMonth : fullDate
  return `${startFormat.format(dayToDate(monday))} – ${fullDate.format(dayToDate(sunday))}`
}
