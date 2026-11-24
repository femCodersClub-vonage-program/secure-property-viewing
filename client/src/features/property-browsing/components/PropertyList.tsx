import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import type { PropertySummary } from '../types'
import PropertyCard from './PropertyCard'

const PAGE_SIZE = 8

/** The cards of the catalog, a few at a time. Give it a `key` per filter, so each one starts short. */
function PropertyList({ properties }: { properties: PropertySummary[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const firstNewRef = useRef<HTMLLIElement>(null)

  const visible = properties.slice(0, visibleCount)
  const hasMore = visibleCount < properties.length

  // "Show more" moves down or disappears, so the focus goes to the first card it added
  useEffect(() => {
    if (visibleCount > PAGE_SIZE) firstNewRef.current?.focus({ preventScroll: true })
  }, [visibleCount])

  return (
    <div className="flex flex-col gap-8 lg:w-96 lg:shrink-0 xl:w-160">
      <ul
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
        aria-label="Properties"
      >
        {visible.map((property, index) => {
          const isFirstNew = index === visibleCount - PAGE_SIZE && index > 0
          return (
            <li
              key={property.id}
              ref={isFirstNew ? firstNewRef : undefined}
              tabIndex={isFirstNew ? -1 : undefined}
              className="reveal flex w-full"
            >
              <PropertyCard property={property} />
            </li>
          )
        })}
      </ul>

      {properties.length > PAGE_SIZE && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-body text-sm text-text-muted" aria-live="polite">
            Showing {visible.length} of {properties.length}
          </p>
          {hasMore && (
            <Button
              variant="secondary"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show more
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default PropertyList
