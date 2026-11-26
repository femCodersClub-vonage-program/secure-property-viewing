import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import SiteNavLink from './SiteNavLink'

function SiteHeader() {
  return (
    <header className="bg-brand-dark">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-4 sm:px-10">
        <Link
          to="/"
          aria-label="Peephole, home page"
          className="flex min-h-11 items-center gap-3 rounded-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light"
        >
          <ShieldCheck className="size-8 text-brand-accent" aria-hidden="true" />
          <span className="font-display text-2xl font-bold text-text-light">Peephole</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <SiteNavLink to="/properties">Properties</SiteNavLink>
            </li>
            <li>
              <SiteNavLink to="/#how-it-works">How it works</SiteNavLink>
            </li>
            <li>
              <SiteNavLink to="/agency/sign-in">Agency sign in</SiteNavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
