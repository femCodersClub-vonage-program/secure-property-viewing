import { MessageCircle, ShieldCheck, Video } from 'lucide-react'
import { Link } from '../components/ui'

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Verified agencies',
    description: 'Every agency on Peephole is manually verified before listing properties.',
  },
  {
    icon: Video,
    title: 'Video visits',
    description: 'Tour a property from wherever you are, with a live agent on screen.',
  },
  {
    icon: MessageCircle,
    title: 'Secure communication',
    description: 'All messages and calls go through Peephole so your details stay private.',
  },
]

function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-surface-page">
      <header className="flex items-center gap-3 px-6 py-4 bg-brand-dark">
        <ShieldCheck className="size-8 text-brand-accent" aria-hidden="true" />
        <span className="font-display text-2xl font-bold text-text-light">Peephole</span>
      </header>

      <section className="relative flex items-end min-h-96 sm:min-h-[520px]">
        <img
          src="/properties/property-03-cover.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient so white text meets 4.5:1 contrast over the photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/50 to-transparent" />
        <div className="relative flex flex-col gap-5 px-6 py-10 max-w-xl sm:px-10">
          <h1 className="font-display text-3xl font-bold text-text-light text-balance sm:text-4xl">
            Find your next home in Catalonia, without scams.
          </h1>
          <p className="font-body text-lg text-text-light/90">
            Verified properties, video visits and secure communication — all in one place.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/properties" variant="button">
              Browse properties
            </Link>
            <Link
              to="/agencies/sign-up"
              variant="button"
              className="bg-transparent border border-text-light text-text-light hover:bg-text-light/10"
            >
              List my property
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="trust-heading"
        className="flex flex-col items-center gap-8 px-4 py-section"
      >
        <h2 id="trust-heading" className="font-display text-2xl font-bold text-brand-dark">
          Why Peephole?
        </h2>
        <ul className="grid gap-6 grid-cols-1 sm:grid-cols-3 max-w-4xl w-full">
          {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col items-center gap-3 text-center px-4">
              <Icon className="size-8 text-brand-primary" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold text-brand-dark">{title}</h3>
              <p className="font-body text-text-muted text-sm">{description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default HomePage
