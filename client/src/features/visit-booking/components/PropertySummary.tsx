import { House, ShieldCheck } from 'lucide-react'
import { Card } from '../../../components/ui'
import { propertyLine } from '../propertyLine'
import type { PropertySummary as Property } from '../types'

function PropertySummary({ property }: { property: Property }) {
  const photo = property.images[0]

  return (
    <Card className="flex items-center gap-4">
      {photo ? (
        <img
          src={photo.url}
          alt={photo.altText}
          className="size-19 flex-none rounded-sm object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-19 flex-none items-center justify-center rounded-sm bg-surface-input text-text-muted"
        >
          <House className="size-8" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-body font-bold text-brand-dark">{property.title}</p>
        <p className="font-body text-sm text-text-muted">{propertyLine(property)}</p>
        {property.agency.verified ? (
          <p className="flex items-center gap-1 font-body text-sm font-bold text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Verified agency
          </p>
        ) : null}
      </div>
    </Card>
  )
}

export default PropertySummary
