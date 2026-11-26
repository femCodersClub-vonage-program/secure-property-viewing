import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

const itemClasses =
  'inline-flex min-h-11 items-center font-body underline-offset-8 transition-colors hover:text-brand-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light'

// Underlined as well as pink, so the current page does not rely on color alone
const activeClasses = 'text-brand-accent underline'
const inactiveClasses = 'text-text-light no-underline'

// Only on brand-dark surfaces: white and pink text, and a white focus outline
function SiteNavLink({ to, children }: { to: string; children: ReactNode }) {
  // A section is never the current page: NavLink ignores the hash and would mark it on its page
  if (to.includes('#')) {
    return (
      <Link to={to} className={`${itemClasses} ${inactiveClasses}`}>
        {children}
      </Link>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${itemClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
    </NavLink>
  )
}

export default SiteNavLink
