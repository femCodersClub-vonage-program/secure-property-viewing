import { useEffect, useState } from 'react'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getAgencySummary } from '../api'
import type { AgencySummary } from '../types'
import DashboardOverview from './DashboardOverview'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; summary: AgencySummary }

// The same look as the greeting in DashboardOverview, so the heading does not jump when the data arrives
const headingClasses =
  'font-dashboard-display text-4xl font-bold tracking-tight text-balance text-brand-dark'

// A business error, such as 401 AUTHENTICATION_REQUIRED, shows the server's message (docs/design-system.md → States)
function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

/** D1: loads the summary and shows it, or says it is loading or could not load. */
function DashboardHome() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  // Each "Try again" adds one, so the effect asks the server again
  const [attempt, setAttempt] = useState(0)

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

  if (load.status === 'ready') {
    return <DashboardOverview summary={load.summary} />
  }

  // Until the agent's name arrives there is no greeting, so the page keeps an h1 with its name
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className={headingClasses}>Dashboard</h1>
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
