import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert, Button, ParallaxImage } from '../components/ui'
import {
  PropertyList,
  PropertyMap,
  getProperties,
  type Operation,
  type PropertySummary,
} from '../features/property-browsing'
import { ApiError } from '../lib/http'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PropertySummary[] }

const OPERATIONS: { label: string; value: Operation | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Rent', value: 'RENT' },
  { label: 'Sale', value: 'SALE' },
]

function parseOperation(value: string | null): Operation | undefined {
  if (value === 'RENT' || value === 'SALE') return value
  return undefined
}

function CatalogPage() {
  useEffect(() => {
    document.title = 'Properties in Barcelona — Peephole'
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const operation = parseOperation(searchParams.get('operation'))
  const [state, setState] = useState<State>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setState({ status: 'loading' })
    const controller = new AbortController()
    getProperties(operation, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
        setState({ status: 'error', message })
      })
    return () => controller.abort()
  }, [operation, retryCount])

  function setOperation(op: Operation | undefined) {
    setSearchParams(op ? { operation: op } : {})
  }

  const properties = state.status === 'success' ? state.data : []

  return (
    <main>
      <section aria-labelledby="catalog-heading" className="relative bg-brand-dark">
        <ParallaxImage src="/properties/property-19-cover.webp" />
        {/* Keeps the white text above 9:1 over any part of the photo */}
        <div className="absolute inset-0 bg-brand-dark/85" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 flex flex-col gap-3 sm:px-10 sm:py-14">
          <h1
            id="catalog-heading"
            className="font-display text-3xl font-bold text-text-light text-balance sm:text-4xl"
          >
            Properties in Barcelona
          </h1>
          <p className="font-body text-lg text-text-light/90">
            For rent and for sale, from verified agencies.
          </p>
        </div>
      </section>

      <div className="sticky top-0 z-10 bg-surface-page border-b border-border py-4">
        <div className="mx-auto w-full max-w-7xl px-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:px-10">
          <div role="group" aria-label="Filter by operation" className="flex gap-2 flex-wrap">
            {OPERATIONS.map(({ label, value }) => (
              <Button
                key={label}
                variant={operation === value ? 'primary' : 'secondary'}
                aria-pressed={operation === value}
                onClick={() => setOperation(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <p className="font-body text-sm text-text-muted" aria-live="polite" aria-atomic="true">
            {state.status === 'success' && state.data.length === 0
              ? 'No properties found.'
              : state.status === 'success'
                ? `${state.data.length} ${state.data.length === 1 ? 'property' : 'properties'} found.`
                : ''}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col gap-section sm:px-10">
        {state.status === 'loading' && (
          <p className="font-body text-text-muted" aria-live="polite">
            Loading properties…
          </p>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col gap-4 items-start">
            <Alert variant="error">{state.message}</Alert>
            <Button onClick={() => setRetryCount((c) => c + 1)}>Try again</Button>
          </div>
        )}

        {state.status === 'success' && state.data.length === 0 && (
          <div className="flex flex-col gap-4 items-start">
            <p className="font-body text-text-default">No properties match the current filter.</p>
            <Button variant="secondary" onClick={() => setOperation(undefined)}>
              Clear filter
            </Button>
          </div>
        )}

        {state.status === 'success' && state.data.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <PropertyList key={operation ?? 'ALL'} properties={properties} />

            <div className="sticky bottom-0 -mx-4 sm:-mx-10 lg:top-24 lg:bottom-auto lg:mx-0 lg:flex-1">
              <PropertyMap properties={properties} className="h-[33vh] lg:h-[calc(100vh-7rem)]" />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default CatalogPage
