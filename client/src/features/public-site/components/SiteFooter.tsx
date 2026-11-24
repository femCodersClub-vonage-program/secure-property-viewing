import { ShieldCheck } from 'lucide-react'
import { LIST_PROPERTY_PATH } from '../paths'
import SiteNavLink from './SiteNavLink'
import TeamLink from './TeamLink'

const TEAM = [
  {
    name: 'Irina Ichim',
    role: 'Tech lead and mentor',
    href: 'https://www.linkedin.com/in/irina-ichim-desarrolladora/',
  },
  {
    name: 'Cande Zamora',
    role: 'Full Stack Developer',
    href: 'https://www.linkedin.com/in/cande-zamora-125301349/',
  },
  {
    name: 'Mayleth Carrascal',
    role: 'Backend Developer',
    href: 'https://www.linkedin.com/in/maylethcarrascal/',
  },
  {
    name: 'Kat Leverton',
    role: 'Accessibility, QA & Full Stack',
    href: 'https://www.linkedin.com/in/kat-leverton/',
  },
  {
    name: 'Viviana Andrango',
    role: 'Full Stack Developer',
    href: 'https://www.linkedin.com/in/viviana-andrango/',
  },
  {
    name: 'Damaris Castro',
    role: 'Full Stack Developer',
    href: 'https://www.linkedin.com/in/damariscastro/',
  },
]

function SiteFooter() {
  return (
    <footer className="bg-brand-dark font-body text-text-light">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-4">
          <div className="flex max-w-lg flex-col gap-2">
            <p className="flex items-center gap-3">
              <ShieldCheck className="size-6 text-brand-accent" aria-hidden="true" />
              <span className="font-display text-lg font-bold">Peephole</span>
            </p>
            <p className="text-sm text-text-light/90">
              A FemCoders Club project built with Vonage APIs. The properties and the agency are
              fictional.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6">
              <li>
                <SiteNavLink to="/properties">Properties</SiteNavLink>
              </li>
              <li>
                <SiteNavLink href="#how-it-works">How it works</SiteNavLink>
              </li>
              <li>
                <SiteNavLink to={LIST_PROPERTY_PATH}>List my property</SiteNavLink>
              </li>
              <li>
                <SiteNavLink to="/agency/sign-in">Agency sign in</SiteNavLink>
              </li>
            </ul>
          </nav>
        </div>

        <section
          aria-labelledby="team-heading"
          className="flex flex-col gap-6 border-t border-text-light/30 pt-8"
        >
          <h2 id="team-heading" className="font-display text-lg font-semibold">
            Meet the team on LinkedIn
          </h2>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((person) => (
              <li key={person.href}>
                <TeamLink {...person} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </footer>
  )
}

export default SiteFooter
