import { CalendarDays, MapPin, MessageSquareText, Phone, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../../components/ui'
import { dayLabel, madridDay, madridTime } from '../calendar'
import type { BookedVisit, PropertyPhoto } from '../types'

type Props = {
  visit: BookedVisit
  photo?: PropertyPhoto
}

type DetailProps = {
  icon: LucideIcon
  term: string
  children: ReactNode
}

function Detail({ icon: Icon, term, children }: DetailProps) {
  return (
    <div className="relative pl-10">
      <dt className="text-sm text-text-light/90">
        <Icon aria-hidden="true" className="absolute top-0.5 left-0 size-6 text-brand-accent" />
        {term}
      </dt>
      {children}
    </div>
  )
}

/** The booked visit on the confirmation screen (A6): the property, the day, the time and the full address. */
function VisitConfirmation({ visit, photo }: Props) {
  return (
    <section aria-labelledby="booked-visit" className="flex">
      <Card variant="dark" flush className="flex w-full flex-col">
        {photo ? (
          <img
            src={photo.url}
            alt={photo.altText}
            className="h-36 min-h-36 w-full grow object-cover"
          />
        ) : null}
        <div className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="booked-visit" className="font-display text-2xl font-bold text-balance">
              {visit.property.title}
            </h2>
            <p className="font-body text-text-light/90">{visit.property.area}</p>
          </div>
          <dl className="flex flex-col gap-4 font-body">
            <Detail icon={CalendarDays} term="When">
              <dd className="text-lg font-bold">{dayLabel(madridDay(visit.startsAt))}</dd>
              <dd className="tabular-nums">
                {madridTime(visit.startsAt)} to {madridTime(visit.endsAt)}, Madrid time
              </dd>
            </Detail>
            <Detail icon={MapPin} term="Address">
              <dd>{visit.property.address}</dd>
            </Detail>
            <Detail icon={MessageSquareText} term="By SMS">
              <dd>
                A confirmation with these details is on its way to your phone. It never includes a
                link.
              </dd>
            </Detail>
            <Detail icon={Phone} term="After the visit">
              <dd>Peephole will call you with one safety question. Answer with your keypad.</dd>
            </Detail>
          </dl>
        </div>
      </Card>
    </section>
  )
}

export default VisitConfirmation
