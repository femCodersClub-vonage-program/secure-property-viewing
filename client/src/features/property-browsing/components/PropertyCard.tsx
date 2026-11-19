import { Bed, MapPin, Maximize2, ShieldCheck } from 'lucide-react'
import { Badge, Card, Link } from '../../../components/ui'
import { formatPrice } from '../price'
import type { PropertySummary } from '../types'

interface PropertyCardProps {
  property: PropertySummary
}

const GENERIC_IMAGE_SRC = '/images/property-placeholder.svg'
const GENERIC_IMAGE_ALT = 'Property image not available'

function PropertyCard({ property }: PropertyCardProps) {
  const { id, title, operation, priceEuros, area, bedrooms, sizeM2, coverImage, agency } = property

  return (
    <Card className="overflow-hidden p-0 flex flex-col h-full">
      <img
        src={coverImage?.url ?? GENERIC_IMAGE_SRC}
        alt={coverImage?.altText ?? GENERIC_IMAGE_ALT}
        className="w-full h-48 object-cover shrink-0"
      />
      <div className="p-card flex flex-col gap-3 flex-1">
        <div>
          <h2 className="font-display text-text-default text-lg font-semibold">{title}</h2>
          <p className="font-body font-semibold text-brand-primary text-base mt-1">
            {formatPrice(priceEuros, operation)}
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Property details">
          <li className="flex items-center gap-1 font-body text-text-muted text-sm">
            <Bed className="size-4 shrink-0" aria-hidden="true" />
            {bedrooms} {bedrooms === 1 ? 'bed' : 'beds'}
          </li>
          <li className="flex items-center gap-1 font-body text-text-muted text-sm">
            <Maximize2 className="size-4 shrink-0" aria-hidden="true" />
            {sizeM2} m²
          </li>
          <li className="flex items-center gap-1 font-body text-text-muted text-sm">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {area}
          </li>
        </ul>

        {agency.verified && (
          <div>
            <Badge variant="approved">
              <ShieldCheck className="size-3 mr-1 inline" aria-hidden="true" />
              Verified agency
            </Badge>
          </div>
        )}

        <Link to={`/properties/${id}`} variant="button" className="w-full mt-auto">
          See the details
        </Link>
      </div>
    </Card>
  )
}

export default PropertyCard
