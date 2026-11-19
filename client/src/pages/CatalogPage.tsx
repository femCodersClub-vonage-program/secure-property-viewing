import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert, Button } from '../components/ui'
import { PropertyCard, getProperties, type Operation, type PropertySummary } from '../features/property-browsing'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const operation = parseOperation(searchParams.get('operation'))
  const [state, setState] = useState<State>({ status: 'loading' })

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
  }, [operation])

  function setOperation(op: Operation | undefined) {
    setSearchParams(op ? { operation: op } : {})
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-section">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-bold text-brand-dark text-balance">
          Properties in Barcelona
        </h1>

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
      </div>

      {state.status === 'loading' && (
        <p className="font-body text-text-muted" aria-live="polite">
          Loading properties…
        </p>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col gap-4 items-start">
          <Alert variant="error">{state.message}</Alert>
          <Button onClick={() => setState({ status: 'loading' })}>Try again</Button>
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
        <ul
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Properties"
        >
          {state.data.map((property) => (
            <li key={property.id} className="flex w-full">
              <PropertyCard property={property} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default CatalogPage
