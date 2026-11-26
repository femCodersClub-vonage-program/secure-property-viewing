import { Check } from 'lucide-react'
import { Link, ParallaxImage } from '../../../components/ui'
import { LISTING_FORM_PATH } from '../paths'

// The three trust points from the spec
const TRUST_POINTS = ['Verified agency', 'Professional support', 'Secure video visits']

// B1: the entry point of journey B, before the form
function ListPropertyIntro() {
  return (
    <section
      aria-labelledby="list-property-title"
      className="grid grid-cols-1 items-center gap-10 md:grid-cols-2"
    >
      <div className="relative h-60 w-full overflow-clip rounded-lg md:order-last lg:h-96">
        <ParallaxImage src="/properties/interior-apartment-03.webp" />
      </div>

      <div className="flex flex-col items-start gap-6">
        <h1
          id="list-property-title"
          className="font-display text-3xl font-bold text-balance text-brand-dark sm:text-4xl"
        >
          Do you have a property to sell or rent in Barcelona?
        </h1>
        <p className="max-w-prose font-body text-lg text-text-default">
          We help you through the whole process, safely and transparently. Tell us about your
          property and verify your phone: you don't need an account.
        </p>
        <ul className="flex flex-col gap-3">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3 font-body text-text-default">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-primary/10 text-brand-primary"
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
        <Link to={LISTING_FORM_PATH} variant="button">
          List my property
        </Link>
      </div>
    </section>
  )
}

export default ListPropertyIntro
