import { Video } from 'lucide-react'
import { useId } from 'react'
import type { UpcomingVisit } from '../types'
import { visitTime } from '../visitTime'
import HighlightLink from './HighlightLink'

function NextVisitCard({ visit }: { visit: UpcomingVisit }) {
  const headingId = useId()
  const time = visitTime(visit)

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-lg bg-linear-120 from-brand-dark via-dashboard-featured-mid to-brand-primary p-8 text-text-light"
    >
      {/* Decorative glow: no text goes on the pink (white on #FF0090 is 3.71:1) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-30 -right-20 size-80 rounded-pill bg-radial from-brand-accent/55 to-transparent to-70%"
      />
      <div className="relative flex flex-col gap-2">
        <h2
          id={headingId}
          className="text-sm font-bold tracking-widest text-dashboard-highlight uppercase"
        >
          Next video visit
        </h2>
        <p className="font-dashboard-display text-3xl font-bold tracking-tight">
          {visit.visitorName}
        </p>
        <p className="text-text-light/85">
          {visit.propertyTitle} · <time dateTime={visit.startsAt}>{time}</time>
        </p>
      </div>
      <HighlightLink to={`/agency/visits/${visit.visitId}/room`}>
        <Video aria-hidden="true" className="size-5" />
        Join visit{' '}
        <span className="sr-only">
          with {visit.visitorName} on {time}
        </span>
      </HighlightLink>
    </section>
  )
}

export default NextVisitCard
