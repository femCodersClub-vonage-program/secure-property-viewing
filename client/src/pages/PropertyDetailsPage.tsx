import { Bed, Building2, MapPin, Maximize2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Alert, Badge, Card, Link } from '../components/ui'
import {
  formatBedrooms,
  PhotoGallery,
  getPropertyById,
  type PropertyDetail,
} from '../features/property-browsing'
import { formatPrice } from '../features/property-browsing/price'
import { ApiError } from '../lib/http'
import NotFoundPage from './NotFoundPage'

const GENERIC_IMAGE_SRC = '/images/property-placeholder.svg'
const GENERIC_IMAGE_ALT = 'Property image not available'

type State =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PropertyDetail }

function PropertyDetailsContent({ property }: { property: PropertyDetail }) {
  useEffect(() => {
    document.title = `${property.title} — Peephole`
  }, [property.title])

  const {
    id,
    title,
    operation,
    priceEuros,
    area,
    bedrooms,
    sizeM2,
    floor,
    description,
    videoVisitAvailable,
    agency,
    images,
  } = property

  const details = [
    { icon: MapPin, label: area },
    { icon: Bed, label: formatBedrooms(bedrooms, 'bedroom') },
    { icon: Maximize2, label: `${sizeM2} m²` },
    ...(floor === null ? [] : [{ icon: Building2, label: `Floor ${floor}` }]),
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 flex flex-col gap-4 sm:px-10">
      <nav aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/properties" className="inline-block py-2.5">
              <span aria-hidden="true">← </span>Back to catalog
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {images.length > 0 ? (
          <PhotoGallery images={images} className="lg:col-span-3 lg:min-h-120" />
        ) : (
          <img
            src={GENERIC_IMAGE_SRC}
            alt={GENERIC_IMAGE_ALT}
            className="w-full h-72 object-cover rounded-md sm:h-96 lg:col-span-3 lg:h-full lg:min-h-120"
          />
        )}

        <Card flush className="flex flex-col gap-5 p-4 sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-bold text-brand-dark text-balance">
              {title}
            </h1>
            <p className="font-body font-semibold text-brand-primary text-2xl">
              {formatPrice(priceEuros, operation)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {agency.verified && (
              <Badge variant="approved">
                <ShieldCheck className="size-3 mr-1 inline" aria-hidden="true" />
                Verified agency
              </Badge>
            )}
            {videoVisitAvailable && <Badge variant="approved">Video visit available</Badge>}
          </div>

          <ul className="grid grid-cols-2 gap-3" aria-label="Property details">
            {details.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-sm bg-surface-input p-2 font-body text-sm text-text-default last:odd:col-span-2 sm:p-3 sm:text-base"
              >
                <Icon className="size-5 shrink-0 text-brand-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          {description && (
            <p className="font-body text-text-default leading-relaxed">{description}</p>
          )}

          <div className="mt-auto flex flex-col gap-4 border-t border-border pt-5">
            {videoVisitAvailable ? (
              <Link to={`/properties/${id}/visit`} variant="button">
                Request a video visit
              </Link>
            ) : (
              <p className="font-body text-text-default">
                This property has no video visits for now.
              </p>
            )}
            <p className="flex items-start gap-2 font-body text-sm text-text-muted">
              <ShieldCheck className="size-5 shrink-0 text-brand-primary" aria-hidden="true" />
              Never pay anything before you sign a contract.
            </p>
          </div>
        </Card>
      </div>
    </main>
  )
}

function PropertyDetailsPage() {
  const { id } = useParams()
  const propertyId = Number(id)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      setState({ status: 'not-found' })
      return
    }
    setState({ status: 'loading' })
    const controller = new AbortController()
    getPropertyById(propertyId, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'not-found' })
          return
        }
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
        setState({ status: 'error', message })
      })
    return () => controller.abort()
  }, [propertyId])

  if (state.status === 'not-found') return <NotFoundPage />

  if (state.status === 'loading') {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-10">
        <p className="font-body text-text-muted" aria-live="polite">
          Loading property…
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 flex flex-col gap-4 items-start sm:px-10">
        <Link to="/properties">
          <span aria-hidden="true">← </span>Back to catalog
        </Link>
        <Alert variant="error">{state.message}</Alert>
      </main>
    )
  }

  return <PropertyDetailsContent property={state.data} />
}

export default PropertyDetailsPage
