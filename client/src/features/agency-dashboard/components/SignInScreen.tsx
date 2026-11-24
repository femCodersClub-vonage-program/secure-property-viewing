import type { AgencyUser } from '../types'
import CenteredScreen from './CenteredScreen'
import SignInForm from './SignInForm'

interface SignInScreenProps {
  onSignedIn: (user: AgencyUser) => void
}

// The dashboard's look around the form, as AgencyLayout gives it to the signed-in pages
function SignInScreen({ onSignedIn }: SignInScreenProps) {
  return (
    <CenteredScreen>
      <SignInForm onSignedIn={onSignedIn} />
    </CenteredScreen>
  )
}

export default SignInScreen
