import { useEffect, useRef } from 'react'
import { Link } from '../../../components/ui'
import { formatPrice } from '../price'
import type { PropertySummary } from '../types'

type Props = {
  property: PropertySummary
  /** Called once the content is on screen, so the map can fit the popup around it. */
  onShown: () => void
}

/** What a pin of the map shows when it is selected: the title, the price and a way to the details. */
function PropertyMapPopup({ property, onShown }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onShown()
    // Leaflet adds the popup after every pin, so the link gets the focus instead of being many Tabs away
    contentRef.current?.querySelector('a')?.focus()
  }, [onShown])

  // m-0 and the text size win over the margins and the 13 px font Leaflet gives popup content
  return (
    <div ref={contentRef} className="flex flex-col gap-1 font-body text-base leading-normal">
      <p className="m-0 font-display text-lg font-bold text-balance text-brand-dark">
        {property.title}
      </p>
      <p className="m-0 font-semibold whitespace-nowrap text-brand-primary">
        {formatPrice(property.priceEuros, property.operation)}
      </p>
      <Link to={`/properties/${property.id}`}>
        See the details<span className="sr-only">: {property.title}</span>
      </Link>
    </div>
  )
}

export default PropertyMapPopup
