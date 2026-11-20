import type { ReactNode } from 'react'
import { Link } from 'react-router'

// Only on the dashboard's dark surfaces: the white focus outline is invisible on white,
// and mango text on white is 1.54:1
function HighlightLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="relative inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-dashboard-highlight px-6 font-dashboard-body font-bold text-brand-dark no-underline shadow-dashboard-highlight hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light"
    >
      {children}
    </Link>
  )
}

export default HighlightLink
