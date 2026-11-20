import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import SideNav from './SideNav'

const NAVIGATION_ID = 'agency-navigation'

function AgencyLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // The menu stays open only on the page where it was opened, so following a link closes it
  const [openOn, setOpenOn] = useState<string | null>(null)
  const isMenuOpen = openOn === pathname

  return (
    <div className="flex min-h-screen flex-col bg-surface-page md:flex-row">
      <header className="flex items-center justify-between bg-brand-dark px-4 py-2 md:hidden">
        <p className="font-display text-lg font-bold text-text-light">Peephole</p>
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls={NAVIGATION_ID}
          onClick={() => setOpenOn(isMenuOpen ? null : pathname)}
          className="flex min-h-11 items-center gap-2 px-3 font-body text-text-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light"
        >
          <Menu aria-hidden="true" className="size-5" />
          Menu
        </button>
      </header>
      <div
        id={NAVIGATION_ID}
        className={`${isMenuOpen ? 'block' : 'hidden'} md:block md:w-64 md:shrink-0`}
      >
        {/* TEMPORARY: until the agency session exists, signing out goes back to the home page */}
        <SideNav onSignOut={() => void navigate('/')} />
      </div>
      <main className="flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default AgencyLayout
