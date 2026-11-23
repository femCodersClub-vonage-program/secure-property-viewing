import { useLocation, useNavigate } from 'react-router'
import { readReturnPath, SignInScreen } from '../features/agency-dashboard'

// Outside AgencyLayout: a signed-out agent has no navigation to show
function AgencySignInPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const returnPath = readReturnPath(location.state)

  return (
    <main>
      <title>Sign in · Peephole</title>
      {/* replace: the Back button does not bring the agent back to the sign-in page */}
      <SignInScreen onSignedIn={() => void navigate(returnPath, { replace: true })} />
    </main>
  )
}

export default AgencySignInPage
