import { useEffect } from 'react'
import { MessageCircle, ShieldCheck, Video } from 'lucide-react'
import { Link, ParallaxImage } from '../components/ui'
import { FeaturedProperties } from '../features/property-browsing'
import {
  HowItWorks,
  LIST_PROPERTY_PATH,
  OwnerBand,
  SiteFooter,
  SiteHeader,
} from '../features/public-site'

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Verified agencies',
    description: 'Every agency on Peephole is manually verified before listing properties.',
  },
  {
    icon: Video,
    title: 'Video visits',
    description: 'Visit a property from wherever you are, with a live agent on screen.',
  },
  {
    icon: MessageCircle,
    title: 'Secure communication',
    description: 'All messages and calls go through Peephole so your details stay private.',
  },
]

function HomePage() {
  useEffect(() => {
    document.title = 'Peephole — Find your next home in Barcelona, without scams.'
  }, [])

  return (
    <>
      <SiteHeader />

      <main className="flex flex-col bg-surface-page">
        <section
          aria-labelledby="hero-heading"
          className="relative flex items-end min-h-96 sm:min-h-[520px]"
        >
          <ParallaxImage src="/properties/property-03-cover.webp" />
          {/* Dark gradient so white text meets 4.5:1 contrast over the photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/70 to-brand-dark/60 sm:to-brand-dark/10" />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-10">
            <div className="flex flex-col gap-5 max-w-xl">
              <h1
                id="hero-heading"
                className="font-display text-3xl font-bold text-text-light text-balance sm:text-4xl"
              >
                Find your next home in Barcelona, without scams.
              </h1>
              <p className="font-body text-lg text-text-light/90">
                Verified properties, video visits and secure communication — all in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/properties" variant="button">
                  Browse properties
                </Link>
                <Link
                  to={LIST_PROPERTY_PATH}
                  variant="button"
                  className="bg-transparent border border-text-light text-text-light hover:bg-text-light/10"
                >
                  List my property
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="trust-heading"
          className="flex flex-col items-center gap-8 px-4 py-14 sm:px-10"
        >
          <h2 id="trust-heading" className="font-display text-2xl font-bold text-brand-dark">
            Why Peephole?
          </h2>
          <ul className="grid gap-6 grid-cols-1 sm:grid-cols-3 max-w-5xl w-full mx-auto">
            {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="reveal flex flex-col items-center gap-3 text-center px-4">
                <Icon className="size-8 text-brand-primary" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-brand-dark">{title}</h3>
                <p className="font-body text-text-muted text-sm">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <FeaturedProperties />
        <HowItWorks />
        <OwnerBand />
      </main>

      <SiteFooter />
    </>
  )
}

export default HomePage
