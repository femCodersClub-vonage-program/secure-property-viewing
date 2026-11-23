import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const navItems: NavItem[] = [
  { to: '/agency', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agency/properties', label: 'Properties', icon: Building2 },
  { to: '/agency/listing-requests', label: 'Listing requests', icon: ClipboardList },
  { to: '/agency/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/agency/messages', label: 'Messages', icon: MessageSquare },
  { to: '/agency/profile', label: 'Profile', icon: UserRound },
]

const itemClasses =
  'flex min-h-11 items-center gap-3 rounded-md px-4 font-dashboard-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light'

// Active: mango background, brand-dark text (11.46:1) and bold, so it does not rely on color alone
const activeClasses = 'bg-dashboard-highlight font-bold text-brand-dark'
const inactiveClasses = 'text-text-light hover:bg-text-light/10'

function SideNav({ onSignOut }: { onSignOut: () => void }) {
  return (
    <nav
      aria-label="Agency"
      className="flex h-full flex-col gap-8 bg-linear-to-b from-brand-dark to-dashboard-nav-end px-4 py-7"
    >
      {/* On mobile the top bar already shows the name */}
      <p className="hidden items-center gap-2.5 px-3 font-dashboard-display text-2xl font-bold tracking-tight text-text-light md:flex">
        <span aria-hidden="true" className="size-3 rounded-pill bg-brand-accent" />
        Peephole
      </p>
      <ul className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `${itemClasses} ${isActive ? activeClasses : inactiveClasses}`
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-text-light/20 pt-3">
        <button
          type="button"
          onClick={onSignOut}
          className={`${itemClasses} ${inactiveClasses} w-full text-left`}
        >
          <LogOut aria-hidden="true" className="size-5" />
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default SideNav
