import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

type SiteNavLinkProps = { children: ReactNode } & ({ to: string } | { href: string })

const itemClasses =
  'inline-flex min-h-11 items-center font-body underline-offset-8 transition-colors hover:text-brand-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light'

// Underlined as well as pink, so the current page does not rely on color alone
const activeClasses = 'text-brand-accent underline'
const inactiveClasses = 'text-text-light no-underline'

// Only on brand-dark surfaces: white and pink text, and a white focus outline
function SiteNavLink({ children, ...target }: SiteNavLinkProps) {
  if ('href' in target) {
    return (
      <a href={target.href} className={`${itemClasses} ${inactiveClasses}`}>
        {children}
      </a>
    )
  }

  return (
    <NavLink
      to={target.to}
      className={({ isActive }) => `${itemClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
    </NavLink>
  )
}

export default SiteNavLink
