import { ShieldCheck } from 'lucide-react'
import { ParallaxImage } from '../../../components/ui'

const STEPS = [
  {
    title: 'Choose a property',
    description:
      'Browse homes listed by verified agencies, with each one placed on a map of Barcelona.',
    stops: 'Stops listings from people nobody has checked',
  },
  {
    title: 'Verify your phone',
    description:
      'Pick a time and confirm your number. There is no account and no password to remember.',
    stops: "Stops bookings made with someone else's number",
  },
  {
    title: 'Visit it live',
    description:
      'An agent shows you the property by video. Share one link with whoever you will live with.',
    stops: 'Stops homes that only exist in photos',
  },
  {
    title: 'Answer one call',
    description:
      'After the visit, Peephole asks whether anyone wanted money before signing. Press 1 and the agency knows.',
    stops: 'Stops deposits paid before a contract',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="relative bg-brand-dark">
      <ParallaxImage src="/properties/property-11-cover.webp" />
      {/* Keeps the white text above 9:1 over any part of the photo */}
      <div className="absolute inset-0 bg-brand-dark/85" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-section px-4 py-16 sm:px-10">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2
            id="how-heading"
            className="font-display text-2xl font-bold text-balance text-text-light"
          >
            Four steps, and the scam each one stops
          </h2>
          <p className="font-body text-lg text-text-light/90">
            Most rental scams ask for money before you have seen the home. Peephole puts a check in
            front of each of those moments.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ title, description, stops }, index) => (
            <li
              key={title}
              className="reveal row-span-4 grid grid-rows-subgrid gap-y-3 rounded-md border border-text-light/20 bg-brand-dark/70 p-6 font-body text-text-light"
            >
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-pill bg-linear-to-br from-brand-primary to-brand-accent font-display text-2xl font-bold"
              >
                {index + 1}
              </span>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="text-text-light/90">{description}</p>
              <p className="flex items-start gap-2 border-t border-text-light/20 pt-4 text-sm font-semibold">
                <ShieldCheck className="size-5 shrink-0 text-brand-accent" aria-hidden="true" />
                {stops}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
