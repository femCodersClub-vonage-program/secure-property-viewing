import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ParallaxImage } from '../../../components/ui'

/** The top of the confirmation screen (A6). */
function VisitBookedHeader({ visitorName }: { visitorName: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The visitor arrives from the calendar, so the focus starts at the new page's heading
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="relative bg-brand-dark">
      <ParallaxImage src="/properties/property-11-cover.webp" />
      {/* Keeps the white text above 9:1 over any part of the photo */}
      <div className="absolute inset-0 bg-brand-dark/85" />
      <div className="relative mx-auto flex w-full max-w-7xl items-center gap-5 px-4 py-10 sm:px-10">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-linear-to-br from-brand-primary to-brand-accent text-text-light"
        >
          <Check className="size-8" strokeWidth={3} />
        </span>
        <div className="flex flex-col gap-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl font-bold text-balance text-text-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light sm:text-4xl"
          >
            Your video visit is booked
          </h1>
          <p className="font-body text-lg text-text-light/90">Thank you, {visitorName}.</p>
        </div>
      </div>
    </div>
  )
}

export default VisitBookedHeader
