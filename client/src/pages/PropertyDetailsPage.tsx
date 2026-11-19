import { Bed, MapPin, Maximize2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Alert, Badge, Link } from '../components/ui'
import { PhotoGallery, getPropertyById, type PropertyDetail } from '../features/property-browsing'
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-section">
      <nav aria-label="Breadcrumb">
        <Link to="/properties">← Back to catalog</Link>
      </nav>

      {images.length > 0 ? (
        <PhotoGallery images={images} />
      ) : (
        <img
          src={GENERIC_IMAGE_SRC}
          alt={GENERIC_IMAGE_ALT}
          className="w-full h-72 object-cover rounded-md sm:h-96"
        />
      )}

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-dark text-balance">{title}</h1>
          <p className="font-body font-semibold text-brand-primary text-2xl mt-1">
            {formatPrice(priceEuros, operation)}
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Property details">
          <li className="flex items-center gap-1.5 font-body text-text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {area}
          </li>
          <li className="flex items-center gap-1.5 font-body text-text-muted">
            <Bed className="size-4 shrink-0" aria-hidden="true" />
            {bedrooms} {bedrooms === 1 ? 'bedroom' : 'bedrooms'}
          </li>
          <li className="flex items-center gap-1.5 font-body text-text-muted">
            <Maximize2 className="size-4 shrink-0" aria-hidden="true" />
            {sizeM2} m²
          </li>
          {floor !== null && <li className="font-body text-text-muted">Floor {floor}</li>}
        </ul>

        <div className="flex flex-wrap gap-2 items-center">
          {agency.verified && (
            <Badge variant="approved">
              <ShieldCheck className="size-3 mr-1 inline" aria-hidden="true" />
              Verified agency
            </Badge>
          )}
          {videoVisitAvailable && <Badge variant="approved">Video visit available</Badge>}
        </div>

        {description && (
          <p className="font-body text-text-default leading-relaxed">{description}</p>
        )}

        {videoVisitAvailable && (
          <Link to={`/properties/${id}/visit`} variant="button" className="self-start">
            Request a video visit
          </Link>
        )}
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="font-body text-text-muted" aria-live="polite">
          Loading property…
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-4 items-start">
        <Link to="/properties">← Back to catalog</Link>
        <Alert variant="error">{state.message}</Alert>
      </main>
    )
  }

  return <PropertyDetailsContent property={state.data} />
}

export default PropertyDetailsPage
