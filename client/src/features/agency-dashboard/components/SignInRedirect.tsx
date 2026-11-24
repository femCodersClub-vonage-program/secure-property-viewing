import { Navigate, useLocation } from 'react-router'
import { SIGN_IN_PATH, type SignInState } from '../returnPath'

/** Sends the agent to the sign-in page, remembering this page so she comes back after signing in. */
function SignInRedirect() {
  const location = useLocation()
  const state = { from: `${location.pathname}${location.search}` } satisfies SignInState
  // replace: the Back button does not bring her to a page she cannot see
  return <Navigate to={SIGN_IN_PATH} replace state={state} />
}

export default SignInRedirect
