import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getAgencyVisits } from '../api'
import type { AgencyVisit } from '../types'
import { addWeeks, currentWeekStart, weekDays, weekEnd, weekLabel } from '../week'
import DashboardHeading from './DashboardHeading'
import WeekView from './WeekView'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; visits: AgencyVisit[] }

// A business error, such as 401 AUTHENTICATION_REQUIRED, shows the server's message (docs/design-system.md → States)
function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

/** D4: the visits of one week in Madrid, starting on the current one, with buttons to change week. */
function VisitsCalendar() {
  // The Monday of the week on screen. The function only runs on the first render
  const [monday, setMonday] = useState(() => currentWeekStart())
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  // Each "Try again" adds one, so the effect asks the server again for the same week
  const [attempt, setAttempt] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const weekHeadingId = useId()
  const label = weekLabel(monday)

  useEffect(() => {
    const controller = new AbortController()
    getAgencyVisits(monday, weekEnd(monday), controller.signal)
      .then((visits) => {
        // An answer that arrives after the agent changed week belongs to the old one
        if (controller.signal.aborted) return
        setLoad({ status: 'ready', visits })
      })
      .catch((error: unknown) => {
        // Leaving the page or changing week cancels the call: that is not an error to show
        if (controller.signal.aborted) return
        setLoad({ status: 'error', message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [monday, attempt])

  function moveWeek(weeks: number) {
    setLoad({ status: 'loading' })
    setMonday((current) => addWeeks(current, weeks))
  }

  function tryAgain() {
    setLoad({ status: 'loading' })
    setAttempt((count) => count + 1)
    // "Try again" is about to disappear, so the focus goes to the page heading,
    // which stays on screen, instead of falling to the page (WCAG 2.4.3)
    headingRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeading ref={headingRef}>Calendar</DashboardHeading>

      <section aria-labelledby={weekHeadingId} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id={weekHeadingId}
            className="font-dashboard-display text-2xl font-bold text-brand-dark"
          >
            {label}
          </h2>
          {/* Always on screen, also while loading or after an error, so the week can change at any time */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => moveWeek(-1)}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              Previous week
            </Button>
            <Button variant="secondary" onClick={() => moveWeek(1)}>
              Next week
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>

        {/* The sentence names the week, so a screen reader hears which one is loading after a button press */}
        {load.status === 'loading' && (
          <p role="status" className="text-text-muted">
            Loading the visits of {label}…
          </p>
        )}

        {load.status === 'error' && (
          <div className="flex flex-col items-start gap-4">
            <Alert variant="error">{load.message}</Alert>
            <Button variant="secondary" onClick={tryAgain}>
              Try again
            </Button>
          </div>
        )}

        {load.status === 'ready' &&
          (load.visits.length > 0 ? (
            <WeekView days={weekDays(monday)} visits={load.visits} />
          ) : (
            <p className="text-text-muted">No visits this week</p>
          ))}
      </section>
    </div>
  )
}

export default VisitsCalendar
