import { House } from 'lucide-react'
import { Card } from '../../../components/ui'
import { propertyLine } from '../propertyLine'
import type { PropertySummary } from '../types'

interface VisitToConfirmProps {
  property: PropertySummary
  time: string
  visitorName: string
}

function VisitToConfirm({ property, time, visitorName }: VisitToConfirmProps) {
  const photo = property.images[0]

  return (
    <section aria-labelledby="visit-to-confirm" className="flex">
      <Card flush className="flex w-full flex-col">
        {photo ? (
          <img
            src={photo.url}
            alt={photo.altText}
            className="h-44 min-h-44 w-full grow object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex min-h-44 grow items-center justify-center bg-surface-input text-text-muted"
          >
            <House className="size-12" />
          </span>
        )}
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <h2
            id="visit-to-confirm"
            className="font-display text-xl font-semibold text-balance text-brand-dark"
          >
            {property.title}
          </h2>
          <p className="font-body text-sm text-text-muted">{propertyLine(property)}</p>
          <div className="flex flex-col gap-0.5 rounded-sm bg-surface-input p-3 font-body">
            <p className="font-bold text-text-default">{time}</p>
            <p className="text-sm text-text-muted">For {visitorName}, in Madrid time</p>
          </div>
        </div>
      </Card>
    </section>
  )
}

export default VisitToConfirm
