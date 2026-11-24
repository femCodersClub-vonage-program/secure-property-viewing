import { Link, ParallaxImage } from '../../../components/ui'
import { LIST_PROPERTY_PATH } from '../paths'

function OwnerBand() {
  return (
    <section
      aria-labelledby="owners-heading"
      className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-10 md:grid-cols-2"
    >
      <div className="relative h-60 w-full lg:h-80">
        <ParallaxImage src="/properties/property-18-cover.webp" className="rounded-lg" />
      </div>
      <div className="reveal flex flex-col items-start gap-5">
        <h2
          id="owners-heading"
          className="font-display text-2xl font-bold text-balance text-brand-dark"
        >
          Own a property in Barcelona?
        </h2>
        <p className="max-w-lg font-body text-lg text-text-default">
          Tell us about it and verify your phone. A verified agency reviews your request before it
          appears on Peephole. You don't need an account.
        </p>
        <Link to={LIST_PROPERTY_PATH} variant="button">
          List my property
        </Link>
      </div>
    </section>
  )
}

export default OwnerBand
