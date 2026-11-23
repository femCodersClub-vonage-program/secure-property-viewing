import { useEffect, useRef, useState } from 'react'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getAgencySummary } from '../api'
import type { AgencySummary } from '../types'
import DashboardHeading from './DashboardHeading'
import DashboardOverview from './DashboardOverview'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; summary: AgencySummary }

// A business error, such as 401 AUTHENTICATION_REQUIRED, shows the server's message (docs/design-system.md → States)
function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

/** D1: loads the summary and shows it, or says it is loading or could not load. */
function DashboardHome() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  // Each "Try again" adds one, so the effect asks the server again
  const [attempt, setAttempt] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    getAgencySummary(controller.signal)
      .then((summary) => setLoad({ status: 'ready', summary }))
      .catch((error: unknown) => {
        // Leaving the page cancels the call: that is not an error to show
        if (controller.signal.aborted) return
        setLoad({ status: 'error', message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [attempt])

  // "Try again" removes the button that had the focus, so after a retry the focus goes to the page heading:
  // "Dashboard" while it loads or fails, and the greeting once the summary arrives (WCAG 2.4.3).
  // The first load leaves the focus alone
  useEffect(() => {
    if (attempt > 0) {
      headingRef.current?.focus()
    }
  }, [attempt, load.status])

  if (load.status === 'ready') {
    return <DashboardOverview summary={load.summary} headingRef={headingRef} />
  }

  // Until the agent's name arrives there is no greeting, so the page keeps an h1 with its name
  return (
    <div className="flex flex-col items-start gap-4">
      <DashboardHeading ref={headingRef}>Dashboard</DashboardHeading>
      {load.status === 'loading' ? (
        <p role="status" className="text-text-muted">
          Loading the dashboard…
        </p>
      ) : (
        <>
          <Alert variant="error">{load.message}</Alert>
          <Button
            variant="secondary"
            onClick={() => {
              setLoad({ status: 'loading' })
              setAttempt((count) => count + 1)
            }}
          >
            Try again
          </Button>
        </>
      )}
    </div>
  )
}

export default DashboardHome
