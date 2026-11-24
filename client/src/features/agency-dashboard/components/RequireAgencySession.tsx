import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getSession, isSignedOut } from '../api'
import CenteredScreen from './CenteredScreen'
import SignInRedirect from './SignInRedirect'

// One state at a time, as client/AGENTS.md asks for states that exclude each other
type Check =
  | { status: 'checking' }
  | { status: 'signed-in' }
  | { status: 'signed-out' }
  | { status: 'error'; message: string }

/** Shows the agency pages only to a signed-in agent, and sends anyone else to the sign-in page. */
function RequireAgencySession() {
  const [check, setCheck] = useState<Check>({ status: 'checking' })
  // Each "Try again" adds one, so the effect asks the server again, as in DashboardHome
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getSession(controller.signal)
      .then(() => setCheck({ status: 'signed-in' }))
      .catch((error: unknown) => {
        // Leaving the page cancels the call: that is not an error to show
        if (controller.signal.aborted) return
        setCheck(
          isSignedOut(error)
            ? { status: 'signed-out' }
            : {
                status: 'error',
                message: error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE,
              },
        )
      })
    return () => controller.abort()
  }, [attempt])

  if (check.status === 'signed-in') {
    return <Outlet />
  }

  if (check.status === 'signed-out') {
    return <SignInRedirect />
  }

  // Its own landmark and tab title: the error can stay on screen while the server is unreachable
  return (
    <main>
      <CenteredScreen>
        {check.status === 'checking' ? (
          <>
            <title>Checking your session · Peephole</title>
            <p role="status" className="text-center text-text-muted">
              Checking your session…
            </p>
          </>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <title>Something went wrong · Peephole</title>
            <Alert variant="error">{check.message}</Alert>
            <Button
              variant="secondary"
              onClick={() => {
                setCheck({ status: 'checking' })
                setAttempt((count) => count + 1)
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </CenteredScreen>
    </main>
  )
}

export default RequireAgencySession
