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
  'flex items-center gap-3 border-l-4 px-4 py-3 font-body text-text-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light'

function SideNav({ onSignOut }: { onSignOut: () => void }) {
  return (
    <nav aria-label="Agency" className="flex h-full flex-col bg-brand-dark py-4">
      <ul className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `${itemClasses} ${isActive ? 'border-text-light font-bold' : 'border-transparent'}`
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-text-light/20 pt-2">
        <button
          type="button"
          onClick={onSignOut}
          className={`${itemClasses} w-full border-transparent text-left`}
        >
          <LogOut aria-hidden="true" className="size-5" />
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default SideNav
