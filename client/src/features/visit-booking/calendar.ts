// Every date the visitor sees is in Madrid time, as the visit booking spec decides, wherever
// the browser is. Days are handled as 'YYYY-MM-DD' keys and months as 'YYYY-MM'.

export const TIME_ZONE = 'Europe/Madrid'
export const BOOKING_WINDOW_DAYS = 14
// Slots that start before 14:00 are listed under "Morning"
const AFTERNOON_STARTS_AT_HOUR = 14

const madridParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partsInMadrid(instant: Date | string) {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const parts = Object.fromEntries(
    madridParts.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    hour: Number(parts.hour),
  }
}

/** The Madrid day of an instant, such as '2026-11-19'. */
export function madridDay(instant: Date | string): string {
  return partsInMadrid(instant).day
}

/** The Madrid time of an instant, such as '11:30'. */
export function madridTime(instant: Date | string): string {
  return partsInMadrid(instant).time
}

export function isMorning(instant: string): boolean {
  return partsInMadrid(instant).hour < AFTERNOON_STARTS_AT_HOUR
}

// A day key read at noon UTC stays on the same calendar day in every time zone
export function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`)
}

const dayLabelFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** Such as 'Thursday 19 November'. */
export function dayLabel(day: string): string {
  return dayLabelFormat.format(dayToDate(day))
}

const monthLabelFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
})

/** Such as 'November 2026'. */
export function monthLabel(month: string): string {
  return monthLabelFormat.format(dayToDate(`${month}-01`))
}

export function monthOf(day: string): string {
  return day.slice(0, 7)
}

export function addDays(day: string, days: number): string {
  const date = dayToDate(day)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Every month from the one of `from` to the one of `to`, both included. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  let day = `${monthOf(from)}-01`
  while (monthOf(day) <= monthOf(to)) {
    months.push(monthOf(day))
    const date = dayToDate(day)
    date.setUTCMonth(date.getUTCMonth() + 1)
    day = date.toISOString().slice(0, 10)
  }
  return months
}

/**
 * The cells of a month in weeks that start on Monday, as calendars do in Spain:
 * `null` for the empty cells before the 1st, then one day key per day.
 */
export function monthGrid(month: string): (string | null)[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const emptyBefore = (first.getUTCDay() + 6) % 7
  const days = Array.from(
    { length: daysInMonth },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  )
  return [...Array<null>(emptyBefore).fill(null), ...days]
}
