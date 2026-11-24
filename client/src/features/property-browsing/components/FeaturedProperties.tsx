import { useEffect, useState } from 'react'
import { Alert, Button, Link } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { getProperties } from '../api'
import { pickFeatured } from '../featured'
import type { PropertySummary } from '../types'
import PropertyCard from './PropertyCard'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PropertySummary[] }

function FeaturedProperties() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getProperties(undefined, controller.signal)
      .then((properties) => setState({ status: 'success', data: pickFeatured(properties) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
        setState({ status: 'error', message })
      })
    return () => controller.abort()
  }, [retryCount])

  function retry() {
    setState({ status: 'loading' })
    setRetryCount((count) => count + 1)
  }

  return (
    <section aria-labelledby="featured-heading" className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-14 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <h2 id="featured-heading" className="font-display text-2xl font-bold text-brand-dark">
            Homes in Barcelona
          </h2>
          <ul className="flex flex-wrap gap-x-6" aria-label="Browse the catalog">
            <li>
              <Link to="/properties?operation=RENT" className="inline-flex min-h-11 items-center">
                For rent
              </Link>
            </li>
            <li>
              <Link to="/properties?operation=SALE" className="inline-flex min-h-11 items-center">
                For sale
              </Link>
            </li>
            <li>
              <Link to="/properties" className="inline-flex min-h-11 items-center">
                See all on the map
              </Link>
            </li>
          </ul>
        </div>

        {state.status === 'loading' && (
          <p className="min-h-96 font-body text-text-muted" role="status">
            Loading properties…
          </p>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-start gap-4">
            <Alert variant="error">{state.message}</Alert>
            <Button onClick={retry}>Try again</Button>
          </div>
        )}

        {state.status === 'success' && state.data.length === 0 && (
          <p className="font-body text-text-muted">No properties to show right now.</p>
        )}

        {state.status === 'success' && state.data.length > 0 && (
          <ul
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Featured properties"
          >
            {state.data.map((property) => (
              <li key={property.id} className="reveal flex">
                <PropertyCard property={property} headingLevel="h3" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default FeaturedProperties
