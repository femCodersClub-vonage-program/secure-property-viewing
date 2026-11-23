import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { Alert } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { isSignedOut, signOut } from '../api'
import { SIGN_IN_PATH } from '../returnPath'
import SideNav from './SideNav'

const NAVIGATION_ID = 'agency-navigation'

function AgencyLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // The menu stays open only on the page where it was opened, so following a link closes it
  const [openOn, setOpenOn] = useState<string | null>(null)
  const isMenuOpen = openOn === pathname
  const [signOutError, setSignOutError] = useState<string>()

  async function handleSignOut() {
    setSignOutError(undefined)
    try {
      await signOut()
    } catch (error) {
      // A 401 means the session had already ended, so she is signed out anyway
      if (!isSignedOut(error)) {
        // The session may still be open: she stays here and can try again
        setSignOutError(error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE)
        return
      }
    }
    void navigate(SIGN_IN_PATH, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-dashboard-page font-dashboard-body text-text-default md:flex-row">
      <header className="flex items-center justify-between bg-brand-dark px-4 py-2 md:hidden">
        <p className="font-dashboard-display text-lg font-bold text-text-light">Peephole</p>
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls={NAVIGATION_ID}
          onClick={() => setOpenOn(isMenuOpen ? null : pathname)}
          className="flex min-h-11 items-center gap-2 px-3 font-dashboard-body text-text-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light"
        >
          <Menu aria-hidden="true" className="size-5" />
          Menu
        </button>
      </header>
      <div
        id={NAVIGATION_ID}
        className={`${isMenuOpen ? 'block' : 'hidden'} md:block md:w-64 md:shrink-0`}
      >
        <SideNav onSignOut={() => void handleSignOut()} />
      </div>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-12 md:py-10">
        {signOutError ? (
          <Alert variant="error" className="mb-6">
            {signOutError}
          </Alert>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}

export default AgencyLayout
